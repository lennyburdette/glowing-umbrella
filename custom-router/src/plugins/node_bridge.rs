use std::ops::ControlFlow;
use std::sync::Arc;

use anyhow::Result;
use apollo_router::graphql;
use apollo_router::layers::ServiceBuilderExt;
use apollo_router::plugin::Plugin;
use apollo_router::plugin::PluginInit;
use apollo_router::register_plugin;
use apollo_router::services::subgraph;
use apollo_router::services::supergraph;
use apollo_router::Context;
use http::Uri;
use reqwest::Url;
use schemars::JsonSchema;
use serde::Deserialize;
use serde_json::Value;
use tower::BoxError;
use tower::ServiceBuilder;
use tower::ServiceExt;

#[derive(Debug)]
struct NodeBridge {
    supergraph_request_filter: Arc<Url>,
    subgraph_url_override: Arc<Uri>,
}

#[derive(Debug, Default, Deserialize, JsonSchema)]
struct Conf {
    supergraph_request_filter: String,
    subgraph_url_override: String,
}

#[async_trait::async_trait]
impl Plugin for NodeBridge {
    type Config = Conf;

    async fn new(init: PluginInit<Self::Config>) -> Result<Self, BoxError> {
        let supergraph_request_filter: Url = init.config.supergraph_request_filter.parse()?;
        let subgraph_url_override: Uri = init.config.subgraph_url_override.parse()?;

        Ok(NodeBridge {
            supergraph_request_filter: Arc::new(supergraph_request_filter),
            subgraph_url_override: Arc::new(subgraph_url_override),
        })
    }

    fn supergraph_service(&self, service: supergraph::BoxService) -> supergraph::BoxService {
        let supergraph_request_filter = self.supergraph_request_filter.clone();

        let handler = move |mut req: supergraph::Request| {
            let supergraph_request_filter = supergraph_request_filter.clone();

            async move {
                let client = reqwest::Client::new();
                let mut filter_req = reqwest::Request::new(
                    http::Method::GET,
                    supergraph_request_filter.as_ref().to_owned(),
                );

                // forward authentication header to filter endpoint
                let auth_header = req
                    .supergraph_request
                    .headers()
                    .get(http::header::AUTHORIZATION);
                if let Some(value) = auth_header {
                    filter_req
                        .headers_mut()
                        .append(http::header::AUTHORIZATION, value.clone());
                }

                // call filter endpoint
                let resp = client.execute(filter_req).await?;

                match resp.status() {
                    // on success, use the authorization header returned from the filter endpoint
                    // on subgraph requests
                    http::StatusCode::OK => {
                        let headers = req.supergraph_request.headers_mut();

                        if let Some(new_value) = resp.headers().get(http::header::AUTHORIZATION) {
                            headers.remove(http::header::AUTHORIZATION);
                            headers.insert(http::header::AUTHORIZATION, new_value.clone());
                        }
                    }

                    // on failure, respond immediately with an error message
                    // using `{ error: "some message" }` in the response if present
                    _ => {
                        let status = resp.status();
                        let json: Value = resp.json().await?;

                        let res = supergraph_error_response(
                            req.context.clone(),
                            status,
                            json["error"].as_str().unwrap_or("Internal server error"),
                        );
                        return Ok(ControlFlow::Break(res));
                    }
                }

                Ok(ControlFlow::Continue(req))
            }
        };

        ServiceBuilder::new()
            .checkpoint_async(handler)
            .buffer(20_000)
            .service(service)
            .boxed()
    }

    fn subgraph_service(&self, name: &str, service: subgraph::BoxService) -> subgraph::BoxService {
        let subgraph_url_override = self.subgraph_url_override.clone();
        let name = name.to_string();

        ServiceBuilder::new()
            .checkpoint(move |mut req: subgraph::Request| {
                let uri = subgraph_url_override.as_ref().to_owned();

                // append "/subgraph-name" to uri and use that as our subgraph URI
                if let Ok(new_uri) = construct_subgraph_uri(uri, name.clone()) {
                    let uri = req.subgraph_request.uri_mut();
                    *uri = new_uri;
                } else {
                    return Ok(ControlFlow::Break(subgraph_error_response(
                        req.context.clone(),
                        http::StatusCode::INTERNAL_SERVER_ERROR,
                        "Internal server error",
                    )));
                }

                Ok(ControlFlow::Continue(req))
            })
            .service(service)
            .boxed()
    }
}

fn construct_subgraph_uri(uri: Uri, path_suffix: String) -> Result<Uri> {
    let mut parts = uri.into_parts();
    let path_and_query = parts.path_and_query.as_ref().clone();

    parts.path_and_query = format!(
        "{}/{}",
        path_and_query.map(|pq| pq.path()).unwrap_or(""),
        path_suffix
    )
    .parse()
    .ok();

    Ok(Uri::from_parts(parts)?)
}

fn supergraph_error_response(
    context: Context,
    status: http::StatusCode,
    message: impl Into<String>,
) -> supergraph::Response {
    supergraph::Response::builder()
        .context(context)
        .status_code(status)
        .error(graphql::Error::builder().message(message).build())
        .build()
        .expect("qed")
}

fn subgraph_error_response(
    context: Context,
    status: http::StatusCode,
    message: impl Into<String>,
) -> subgraph::Response {
    subgraph::Response::error_builder()
        .context(context)
        .error(graphql::Error::builder().message(message).build())
        .status_code(status)
        .build()
        .expect("qed")
}

// This macro allows us to use it in our plugin registry!
// register_plugin takes a group name, and a plugin name.
register_plugin!("example", "node_bridge", NodeBridge);

#[cfg(test)]
mod tests {
    use apollo_router::services::supergraph;
    use apollo_router::TestHarness;
    use tower::BoxError;
    use tower::ServiceExt;

    #[tokio::test]
    async fn basic_test() -> Result<(), BoxError> {
        let test_harness = TestHarness::builder()
            .configuration_json(serde_json::json!({
                "plugins": {
                    "router.node_bridge": {
                        "message" : "Starting my plugin"
                    }
                }
            }))
            .unwrap()
            .build()
            .await
            .unwrap();
        let request = supergraph::Request::canned_builder().build().unwrap();
        let mut streamed_response = test_harness.oneshot(request).await?;

        let first_response = streamed_response
            .next_response()
            .await
            .expect("couldn't get primary response");

        assert!(first_response.data.is_some());

        println!("first response: {:?}", first_response);
        let next = streamed_response.next_response().await;
        println!("next response: {:?}", next);

        // You could keep calling .next_response() until it yields None if you're expexting more parts.
        assert!(next.is_none());
        Ok(())
    }
}

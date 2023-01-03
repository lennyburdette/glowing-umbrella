fn subgraph_service(service, subgraph) {
  let request_callback = |request| {
    if request.context.subgraph_proxy_host != () && request.context.subgraph_proxy_path != () {
      request.subgraph.uri.host = request.context.subgraph_proxy_host;
      request.subgraph.uri.path = `${request.context.subgraph_proxy_path}/${subgraph}`;
    }
  };

  service.map_request(request_callback);
}

/**
 * @param {{ subgraphProxyHost: string; subgraphProxyPath: string; }} params
 */
export function handleRouterStage({ subgraphProxyHost, subgraphProxyPath }) {
  /**
   * @param {import("express").Request} req
   * @param {import("express").Response} res
   */
  return async (req, res) => {
    if (!isRouterRequest(req.body)) {
      console.log("not a router request");
      res.json({
        version: 1,
        control: { Break: 500 },
        body: "Internal server error",
      });
      return;
    }

    const [isAuthorized, newHeaders] = authorize(req.body.headers);

    if (isAuthorized) {
      console.log("request authorized");
      const resp = {
        ...req.body,
        headers: { ...req.body.headers, ...newHeaders },
        context: {
          entries: {
            ...req.body.context.entries,
            subgraph_proxy_host: subgraphProxyHost,
            subgraph_proxy_path: subgraphProxyPath,
          },
        },
      };
      res.json(resp);
    } else {
      console.log("not authorized");
      res.json({
        ...req.body,
        control: { Break: 401 },
        body: "Not authorized",
      });
    }
  };
}

/**
 * @param {any} body
 */
function isRouterRequest(body) {
  return body?.version === 1 && body?.stage === "RouterRequest";
}

/**
 * @param {{ [key: string]: string[] } | undefined} headers
 * @returns {[boolean, { [key: string]: string[] }]}
 */
function authorize(headers) {
  if (headers?.authorization?.includes("42")) {
    return [true, { authorization: ["108"] }];
  } else {
    return [false, {}];
  }
}

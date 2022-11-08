import { NodeEndpoints } from "./src/node-endpoints.js";
import { RouterWrapper } from "./src/router-wrapper.js";

const routerWrapper = new RouterWrapper();

const nodeEndpoints = new NodeEndpoints({
  port: process.env.INTERNAL_PORT ?? "4001",
  servicesConfigPath: "services.json",
});

nodeEndpoints.addHealthCheck(routerWrapper.healthCheck);

await Promise.all([
  routerWrapper.run({
    port: process.env.PORT ?? "4000",
    authEndpoint: nodeEndpoints.authAddress,
    subgraphProxyEndpoint: nodeEndpoints.subgraphProxyAddress,
  }),

  nodeEndpoints.run(),
]);

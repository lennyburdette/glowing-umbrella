import { NodeEndpoints } from "./src/node-endpoints.js";
import { RouterWrapper } from "./src/router-wrapper.js";

const routerWrapper = new RouterWrapper({
  healthCheckPort: "8088",
  metricsPort: "9090",
});

const nodeEndpoints = new NodeEndpoints({
  port: process.env.INTERNAL_PORT ?? "4001",
  servicesConfigPath: "services.json",
});

nodeEndpoints.addHealthCheck(routerWrapper.healthCheck);

await Promise.all([
  routerWrapper.run({
    routerStageUrl: nodeEndpoints.routerStageUrl,
  }),
  nodeEndpoints.run(),
]);

process.on("unhandledRejection", (error) => {
  console.log("unhandledRejection", error);
});

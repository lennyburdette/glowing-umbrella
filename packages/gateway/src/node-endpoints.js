import express, { json } from "express";
import { readFileSync } from "fs";
import { handleRouterStage } from "./router-stage.js";
import { proxyRequest } from "./proxy.js";

export class NodeEndpoints {
  /**
   * @type {{ [serviceName: string]: { host: string; port: string } }}
   */
  services;

  /**
   * @param {{ port: string; servicesConfigPath: string; }} params
   */
  constructor({ port, servicesConfigPath }) {
    this.port = port;

    this.services = JSON.parse(
      readFileSync(servicesConfigPath, "utf-8")
    ).services;
  }

  /** @type {Array<() => Promise<boolean>>} */
  #healthChecks = [];

  /**
   * @param {() => Promise<boolean>} check
   */
  addHealthCheck(check) {
    this.#healthChecks.push(check);
  }

  get routerStageUrl() {
    return `http://127.0.0.1:${this.port}/router_stage`;
  }

  async run() {
    const app = express();

    app.get("/health", async (_, res) => {
      try {
        const checks = await Promise.all(this.#healthChecks.map((fn) => fn()));
        if (checks.every((success) => success)) {
          res.json({ ok: true });
        } else {
          res.statusCode = 500;
          res.json({ ok: false });
        }
      } catch (e) {
        console.error(e);
        res.statusCode = 500;
        res.json({ ok: false });
      }
    });

    app.post(
      "/router_stage",
      json(),
      handleRouterStage({
        subgraphProxyHost: `127.0.0.1:${this.port}`,
        subgraphProxyPath: "/subgraph-proxy",
      })
    );

    app.post("/subgraph-proxy/:subgraph", async (req, res) => {
      const { subgraph } = req.params;
      try {
        const { host, port } = this.services[subgraph] ?? {};

        if (!host || !port) {
          res.statusCode = 500;
          res.json({
            data: null,
            errors: [{ message: `Invalid subgraph ${subgraph}` }],
          });
          return;
        }

        const url = `http://${host}:${port}/`;

        console.log(`proxy request for subgraph ${subgraph} -> ${url}`);
        await proxyRequest(req, res, url);
      } catch (e) {
        console.error(e);
        res.statusCode = 500;
        res.json({
          data: null,
          errors: [{ message: `Error proxying to subgraph ${subgraph}` }],
        });
      }
    });

    await /** @type {Promise<void>} */ (
      new Promise((resolve) => {
        app.listen(this.port, () => resolve());
      })
    );

    console.log("running node endpoints");
  }
}

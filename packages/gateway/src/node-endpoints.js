import express from "express";
import { readFileSync } from "fs";
import { auth } from "./auth.js";
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

  get authAddress() {
    return `http://127.0.0.1:${this.port}/auth`;
  }

  get subgraphProxyAddress() {
    return `http://127.0.0.1:${this.port}/subgraph-proxy`;
  }

  async run() {
    const app = express();

    app.get("/health", async (_, res) => {
      const checks = await Promise.all(this.#healthChecks.map((fn) => fn()));
      if (checks.every((success) => success)) {
        res.json({ ok: true });
      } else {
        res.statusCode = 500;
        res.json({ ok: false });
      }
    });

    app.get("/auth", auth);

    app.post("/subgraph-proxy/:subgraph", async (req, res) => {
      const { subgraph } = req.params;
      const { host, port } = this.services[subgraph] ?? {};
      const url = `http://${host}:${port}/`;

      console.log(`proxy request for subgraph ${subgraph} -> ${url}`);
      await proxyRequest(req, res, url);
    });

    await new Promise((resolve) => {
      app.listen(this.port, () => resolve(1));
    });

    console.log("running node endpoints");
  }
}

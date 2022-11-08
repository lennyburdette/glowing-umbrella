import { execa } from "execa";
import { writeFile } from "fs/promises";
import { dump } from "js-yaml";
import { fetch } from "undici";

export class RouterWrapper {
  /** @type {string} */
  healthCheckListen = "127.0.0.1:8088";

  get healthCheck() {
    return async () => {
      const resp = await fetch(`http://${this.healthCheckListen}/health`);
      console.log(`router healthy: ${resp.ok}`);
      return resp.ok;
    };
  }

  /**
   * @param {{ port: string; authEndpoint: string; subgraphProxyEndpoint: string; }} params
   */
  async writeConfig({ port, authEndpoint, subgraphProxyEndpoint }) {
    return writeFile(
      "router.yaml",
      dump({
        supergraph: {
          listen: `0.0.0.0:${port}`,
        },
        "health-check": {
          listen: this.healthCheckListen,
          enabled: true,
        },
        plugins: {
          "example.node_bridge": {
            supergraph_request_filter: authEndpoint,
            subgraph_url_override: subgraphProxyEndpoint,
          },
        },
        headers: {
          all: {
            request: [
              {
                propagate: {
                  named: "authorization",
                },
              },
            ],
          },
        },
      }),
      "utf-8"
    );
  }

  /**
   * @param {{ port: string; authEndpoint: string; subgraphProxyEndpoint: string; }} params
   */
  async run(params) {
    await this.writeConfig(params);

    const proc = execa("./router", ["-c", "./router.yaml", "--hr", "--dev"]);

    proc.stdout?.pipe(process.stdout);
    proc.stderr?.pipe(process.stderr);

    process.on("SIGTERM", () => {
      proc.kill("SIGKILL");
    });
    process.on("SIGINT", () => {
      proc.kill("SIGKILL");
    });

    await proc;
  }
}

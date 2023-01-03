import { execa } from "execa";
import { fetch } from "undici";

export class RouterWrapper {
  /**
   * @param {{
   *  healthCheckPort: string;
   *  metricsPort: string;
   * }} params
   */
  constructor({ healthCheckPort, metricsPort }) {
    this.healthCheckPort = healthCheckPort;
    this.healthCheckListen = `127.0.0.0.1:${healthCheckPort}/health`;
    this.metricsPort = metricsPort;
  }

  get healthCheck() {
    return async () => {
      const resp = await fetch(this.healthCheckListen);
      console.log(`router healthy: ${resp.ok}`);
      return resp.ok;
    };
  }

  /**
   * @param {{ routerStageUrl: string }} param0
   */
  async run({ routerStageUrl }) {
    const proc = execa(
      "./router",
      ["-c", "./router.yaml", "--hr", "--dev" /*, "--log", "debug'*/],
      {
        env: {
          ROUTER_STAGE_URL: routerStageUrl,
          HEALTH_CHECK_PORT: this.healthCheckPort,
          METRICS_PORT: this.metricsPort,
        },
        // expects:
        // - PORT
        // - APOLLO_KEY
        // - APOLLO_GRAPH_REF
        extendEnv: true,
      }
    );

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

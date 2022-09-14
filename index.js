import { execa } from "execa";
import { writeFile } from "fs/promises";
import { dump } from "js-yaml";
import { composeServices } from "@apollo/composition";
import { parse } from "graphql";

async function writeConfig() {
  return writeFile(
    "router.yaml",
    dump({
      server: {
        listen: `0.0.0.0:${process.env.PORT}`,
      },
      override_subgraph_url: {
        a: "http://localhost:8080",
        b: "http://localhost:8081",
      },
    }),
    "utf-8"
  );
}

async function writeSupergraph() {
  const result = composeServices([
    {
      name: "a",
      url: "placeholder",
      typeDefs: parse(`
      type Query {
        a: String
      }
    `),
    },
    {
      name: "b",
      url: "placeholder",
      typeDefs: parse(`
      type Query {
        b: String
      }
    `),
    },
  ]);

  if (result.supergraphSdl) {
    return writeFile("supergraph.graphql", result.supergraphSdl, "utf-8");
  } else {
    console.log(result.errors);
    process.exit(1);
  }
}

async function runRouter() {
  const proc = execa("./router", [
    "-c",
    "./router.yaml",
    "-s",
    "./supergraph.graphql",
    // "--hr", // https://github.com/apollographql/router/issues/1476
  ]);
  proc.stdout.pipe(process.stdout);
  proc.stdout.pipe(process.stderr);

  process.on("SIGTERM", () => proc.kill("SIGTERM"));
  process.on("SIGINT", () => proc.kill("SIGINT"));
}

await writeConfig();
await writeSupergraph();
await runRouter();

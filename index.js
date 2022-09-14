import { execa } from "execa";
import { writeFile } from "fs/promises";
import { dump } from "js-yaml";
import { composeServices } from "@apollo/composition";
import { parse } from "graphql";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { addMocksToSchema } from "@graphql-tools/mock";
import { parse as parseUrl } from "url";

const subgraphs = [
  {
    name: "a",
    url: "http://localhost:8080",
    typeDefs: parse(`
      type Query {
        a: String
      }
    `),
  },
  {
    name: "b",
    url: "http://localhost:8081",
    typeDefs: parse(`
      type Query {
        b: String
      }
    `),
  },
];

async function startSubgraphs() {
  return Promise.all(
    subgraphs.map((subgraph) => {
      const server = new ApolloServer({
        schema: addMocksToSchema({
          schema: buildSubgraphSchema({
            typeDefs: subgraph.typeDefs,
          }),
        }),
      });
      return startStandaloneServer(server, {
        listen: { port: Number(parseUrl(subgraph.url).port ?? 0) },
      });
    })
  );
}

async function writeConfig() {
  return writeFile(
    "router.yaml",
    dump({
      server: {
        listen: `0.0.0.0:${process.env.PORT}`,
      },
    }),
    "utf-8"
  );
}

async function writeSupergraph() {
  const result = composeServices(subgraphs);

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

  proc?.stdout?.pipe(process.stdout);
  proc?.stdout?.pipe(process.stderr);

  process.on("SIGTERM", () => proc.kill("SIGTERM"));
  process.on("SIGINT", () => proc.kill("SIGINT"));
}

await writeConfig();
await writeSupergraph();
await startSubgraphs();
await runRouter();

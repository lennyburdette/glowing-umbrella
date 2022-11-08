import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { parse } from "graphql";
import { readFileSync } from "fs";

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs: parse(readFileSync("schema.graphql", "utf-8")),
    resolvers: {
      Query: {
        two: () => true,
      },
    },
  }),
});

const { url } = await startStandaloneServer(server, {
  listen: {
    port: parseInt(process.env.PORT ?? "4000"),
  },
});
console.log(`🚀 subgraph two: ${url}`);

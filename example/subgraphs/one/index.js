import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { GraphQLError, parse } from "graphql";
import { readFileSync } from "fs";

const server = new ApolloServer({
  schema: buildSubgraphSchema({
    typeDefs: parse(readFileSync("schema.graphql", "utf-8")),
    resolvers: {
      Query: {
        one: () => {
          if (Math.random() < 0.2) throw new Error("whoops");
          return true;
        },
      },
    },
  }),
  plugins: [
    {
      async requestDidStart({ request }) {
        console.log(request.http?.headers);
        return {
          async didEncounterErrors({ response }) {
            response.http.status = 500;
          },
        };
      },
    },
  ],
});

const { url } = await startStandaloneServer(server, {
  listen: {
    port: parseInt(process.env.PORT ?? "4000"),
  },
});
console.log(`🚀 subgraph one: ${url}`);

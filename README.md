## Usage

1. Get an `APOLLO_KEY` and `APOLLO_GRAPH_REF` from Apollo Studio and export them as environment variables.
2. `yarn install` -> install node dependencies
3. `yarn subgraphs:publish` -> publish subgraphs to studio for managed federation
4. `docker compose up --build` -> build and run gateway and subgraphs
5. Visit localhost:4000 and execute this operation:

   ```graphql
   {
     one
     two
   }
   ```

6. Observe a 401 response with a "Not authorized" error.
7. Add a header to the request:

   ```sh
   curl http://localhost:4000 -H 'content-type: application/json' \
     -H 'authorization: 42' \
     -d '{"query": "{one two}"}'
   ```

8. Observe a successful response
9. Observe logs:
   - router-manager-subgraph_one-1 logs the mutated `authorization` header
   - router-manager-gateway-1 logs messages about proxying requests to subgraphs

Request flow:

- Router receives client request
- Router calls localhost:4001/router_stage with RouterRequest stage
- Node.js receives call and authorizes the request
  - It changes the `authorization` header to an "internal" token
  - It also adds subgraph proxy config to the context
- If Node.js responds with `control: { Break: XXX }`, the router responds immediately
- If Node.js responds with `control: 'Continue'`, the router proceeds with the request
- A `map_request` Rhai hook mutates the subgraph request URI to point to another Node.js endpoint, `localhost:4001/subgraph-proxy/${subgraph_name}`
- Node.js proxies the request to the actual subgraph using host and port data found in `services.json`.

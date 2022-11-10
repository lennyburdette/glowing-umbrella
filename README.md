## Usage

1. Get an `APOLLO_KEY` and `APOLLO_GRAPH_REF` from Apollo Studio and export them as environment variables.
2. `yarn install` -> install node dependencies
3. `yarn publish` -> publish subgraphs to studio for managed federation
4. `yarn build:router` -> build router binary and copy to gateway
5. `docker compose up --build` -> build and run gateway and subgraphs
6. Make requests to sandbox on `http://localhost:4000` with an `authorization: 42` header.

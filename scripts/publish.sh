#!/usr/bin/env bash

rover subgraph publish $APOLLO_GRAPH_REF \
  --name one \
  --schema example/subgraphs/one/schema.graphql \
  --routing-url /doesnt/really/matter

rover subgraph publish $APOLLO_GRAPH_REF \
  --name two \
  --schema example/subgraphs/two/schema.graphql \
  --routing-url /doesnt/really/matter

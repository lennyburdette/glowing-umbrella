#!/usr/bin/env bash

cd custom-router
docker build . -t "nodebridgerouter:latest" --output out
cp out/dist/router ../packages/gateway/

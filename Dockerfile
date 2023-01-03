# FROM --platform=linux/amd64 node:18
FROM node:18

WORKDIR /app

COPY package.json yarn.lock .

WORKDIR /root/packages/app
RUN curl -sSL https://router.apollo.dev/download/nix/v1.7.0 | sh
COPY packages/gateway/package.json .
RUN yarn install

COPY packages/gateway/router.yaml .
COPY packages/gateway/services.json .
COPY packages/gateway/rhai/ rhai/
COPY packages/gateway/index.js .
COPY packages/gateway/src/ src/

CMD ["node", "index.js"]

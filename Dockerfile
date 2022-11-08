# FROM --platform=linux/amd64 node:18
FROM node:18

WORKDIR /root

COPY package.json yarn.lock .

WORKDIR /root/packages/app
COPY packages/gateway/package.json .
RUN yarn install

COPY packages/gateway/router .
COPY packages/gateway/index.js .
COPY packages/gateway/src/ src/
COPY packages/gateway/services.json .

CMD ["node", "index.js"]

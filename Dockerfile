FROM --platform=linux/amd64 node:18

WORKDIR /app

COPY package.json yarn.lock .
COPY install.sh .
RUN yarn install --frozen-lockfile
COPY index.js .

CMD ["node", "index.js"]

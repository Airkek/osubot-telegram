# syntax=docker/dockerfile:1

FROM node:24-alpine3.24 AS node-build

WORKDIR /src

COPY package.json package-lock.json ./
RUN mkdir -p src && npm ci

COPY tsconfig.json index.ts ./
COPY src/ ./src/
COPY assets/ ./assets/
COPY performance-server/proto/ ./performance-server/proto/
RUN npm run build:node && npm prune --omit=dev

FROM alpine:3.24 AS runtime

WORKDIR /usr/osubot

RUN apk add --no-cache dumb-init libstdc++

ENV NODE_ENV=production

COPY --from=node-build /usr/local/bin/node /usr/local/bin/node
COPY --from=node-build /src/node_modules/ ./node_modules/
COPY --from=node-build /src/build/ ./build/
RUN --mount=type=bind,source=tools/runtime-smoke-test.mjs,target=/tmp/runtime-smoke-test.mjs,ro \
    node /tmp/runtime-smoke-test.mjs

COPY healthcheck.js LICENSE NOTICE ./

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "./build"]

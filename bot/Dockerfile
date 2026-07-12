# syntax=docker/dockerfile:1

FROM node:24-alpine3.24 AS node-build

WORKDIR /workspace/bot

COPY bot/package.json bot/package-lock.json ./
COPY bot/tools/generate-version.mjs ./tools/generate-version.mjs
RUN mkdir -p src && npm ci

COPY bot/tsconfig.json ./
COPY bot/src/ ./src/
COPY bot/assets/ ./assets/
COPY bot/tools/ ./tools/
COPY contracts/ /workspace/contracts/
RUN npm run build:node && npm prune --omit=dev

FROM alpine:3.24 AS runtime

WORKDIR /usr/osubot

RUN apk add --no-cache dumb-init libstdc++

ENV NODE_ENV=production

COPY --from=node-build /usr/local/bin/node /usr/local/bin/node
COPY --from=node-build /workspace/bot/node_modules/ ./node_modules/
COPY --from=node-build /workspace/bot/build/ ./build/
RUN --mount=type=bind,source=bot/tools/runtime-smoke-test.mjs,target=/tmp/runtime-smoke-test.mjs,ro \
    node /tmp/runtime-smoke-test.mjs

COPY bot/healthcheck.js ./
COPY LICENSE NOTICE ./

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "./build/src/main.js"]

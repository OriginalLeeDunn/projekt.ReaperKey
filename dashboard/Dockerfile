# GhostKey Dashboard — internal ops dashboard (React + Vite frontend, Express API).
#
# Runs in dev mode (vite + node, same as `npm run dev`) rather than a built
# production bundle: the dashboard reads live state from the mounted repo
# (docs/agents/*.md, db/ghostkey.db) via fs.watch, so it's meant to reflect
# whatever's on disk right now, not a frozen snapshot baked into the image.
#
# node_modules is built here (better-sqlite3 needs native bindings compiled
# for the container's platform) and layered under the repo bind mount at
# runtime via a named volume — see docker-compose.yml.
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo/dashboard

COPY package.json package-lock.json ./
RUN npm ci

EXPOSE 3002 3003

CMD ["sh", "-c", "npx concurrently -n vite,api -c blue,green \"vite --port 3002 --host\" \"node server.js\""]

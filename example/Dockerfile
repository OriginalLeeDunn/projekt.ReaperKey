# GhostKey Reference App.
#
# Build context is the repo root (not example/ alone) because this app
# depends on @ghostkey/sdk via `file:../sdk` — npm needs the real sdk/
# directory present at that relative path to resolve it, so both packages
# have to be copied in and sdk built before `npm ci` runs here.
FROM node:20-bookworm-slim

WORKDIR /repo

COPY sdk/package.json sdk/package-lock.json sdk/
RUN npm --prefix sdk ci
COPY sdk sdk/
RUN npm --prefix sdk run build

COPY example/package.json example/package-lock.json example/
RUN npm --prefix example ci
COPY example example/

WORKDIR /repo/example
EXPOSE 3000
CMD ["npx", "vite", "--port", "3000", "--host"]

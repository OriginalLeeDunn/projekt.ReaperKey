# GhostKey Story — fully self-contained (no repo/server dependency, no live
# data), so unlike dashboard/ this bakes a real production build rather than
# running a dev server.
FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
RUN npm install -g serve
EXPOSE 3005
CMD ["serve", "-s", "dist", "-l", "3005"]

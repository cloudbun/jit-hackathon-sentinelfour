FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build client + server
FROM deps AS build
COPY . .
RUN bun run build

# Production image
FROM base AS runtime
COPY --from=build /app/dist dist
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json .

EXPOSE 3000
CMD ["bun", "dist/server/server.js"]

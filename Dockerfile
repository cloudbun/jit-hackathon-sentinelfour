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

# Include seed script for optional data initialization
# Usage: docker exec <container> bun run src/seed-applications.ts
COPY --from=build /app/src/db.ts src/db.ts
COPY --from=build /app/src/seed-applications.ts src/seed-applications.ts

# Persist SQLite database across container restarts
VOLUME /app/data
ENV DATABASE_PATH=/app/data/data.db

EXPOSE 3000
CMD ["bun", "dist/server/server.js"]

# ==========================================
# Stage 1: Build Frontend and Backend
# ==========================================
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install native build tools required for compiling better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install all dependencies (including devDependencies needed for build)
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build client (Vite) and server (esbuild)
RUN npm run build

# Remove development dependencies to keep production footprint minimal
RUN npm prune --omit=dev

# ==========================================
# Stage 2: Production Runner
# ==========================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

# Install curl for container health check and ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data

# Copy production artifacts from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-server ./dist-server

# Ensure persistent data directory exists
RUN mkdir -p /app/data

# Volume for SQLite persistence across restarts / redeployments
VOLUME ["/app/data"]

EXPOSE 3000

# Health check probe for Easypanel / Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

CMD ["node", "dist-server/server.js"]

# syntax=docker/dockerfile:1.7
# Morbius v2.0 — single image with Claude CLI + Playwright Chromium baked in.
# Story: S-025-001. See requirements/arch.md → "v2.0 Cloud Deployment".
#
# Constraint C5 (E-025): pin @anthropic-ai/claude-code@1.x.x. Bumps are explicit.
#
# Build:  docker build -t morbius:v2.0 .
# Run:    docker run -p 9000:9000 \
#           -e MORBIUS_DATA_DIR=/data \
#           -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
#           -v $(pwd)/data:/data \
#           morbius:v2.0

# ──────────────────────────────────────────────────────────────────────
# Stage 1 — builder: compile TypeScript to dist/
# ──────────────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Prune dev deps for the runtime copy
RUN npm prune --omit=dev

# ──────────────────────────────────────────────────────────────────────
# Stage 2 — runtime: Node 20 + Claude CLI + Playwright Chromium + dist/
# ──────────────────────────────────────────────────────────────────────
FROM node:20-slim AS runtime

ENV NODE_ENV=production \
    MORBIUS_DATA_DIR=/data \
    PORT=9000 \
    PLAYWRIGHT_BROWSERS_PATH=/opt/playwright-browsers

WORKDIR /app

# OS packages: git/ca-certs/curl for runtime + Playwright system deps for Chromium.
# `playwright install --with-deps chromium` (run below) handles the Chromium-specific
# libs; we add git/ca-certs/curl explicitly because cloud-bootstrap.sh (S-025-005)
# needs them and they're stripped from node:20-slim.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        git \
        ca-certificates \
        curl \
 && rm -rf /var/lib/apt/lists/*

# Claude CLI — pinned to 1.x per Constraint C5.
# Used by src/runners/web-agent.ts (cli-subprocess mode) and the /ws/chat bridge.
RUN npm install -g @anthropic-ai/claude-code@1

# Playwright + Chromium with system deps. `--with-deps` pulls the apt libraries
# Chromium needs (libnss3, libatk-bridge2.0-0, etc.) — keeps the runtime offline-safe.
RUN npm install -g playwright@1 \
 && npx --yes playwright install --with-deps chromium

# Copy compiled app + production node_modules from builder.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Healthcheck — the dashboard root returns 200 once the server is up.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:${PORT}/ > /dev/null || exit 1

EXPOSE 9000
VOLUME ["/data"]

CMD ["node", "dist/index.js", "serve", "--port", "9000"]

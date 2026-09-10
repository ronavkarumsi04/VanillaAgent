# Stage 1: Build & Native compilation
FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json vitest.config.ts ./
COPY packages/ ./packages/
COPY src/ ./src/

RUN pnpm install --ignore-scripts
RUN cd node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3 && npm run build-release --nodedir=/usr/local
RUN pnpm build

# Stage 2: Production runtime
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV VANILLA_AGENT_DIR=/app/data
ENV METRICS_PORT=3000

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# Create non-root user and state directory
RUN groupadd -g 1001 vanilla && \
    useradd -u 1001 -g vanilla -m vanilla && \
    mkdir -p /app/data && \
    chown -R vanilla:vanilla /app

USER vanilla

COPY --chown=vanilla:vanilla --from=builder /app/package.json ./
COPY --chown=vanilla:vanilla --from=builder /app/pnpm-workspace.yaml ./
COPY --chown=vanilla:vanilla --from=builder /app/node_modules ./node_modules
COPY --chown=vanilla:vanilla --from=builder /app/dist ./dist
COPY --chown=vanilla:vanilla --from=builder /app/packages ./packages

EXPOSE 3000

VOLUME ["/app/data"]

ENTRYPOINT ["node", "dist/index.js"]
CMD ["--run"]

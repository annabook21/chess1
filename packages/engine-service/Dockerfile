FROM node:20-slim

WORKDIR /app

# Install Stockfish from apt-get (supports multiple architectures including ARM64)
# Also install wget for healthcheck
RUN apt-get update && \
    apt-get install -y wget stockfish && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Verify Stockfish installation and set up symlink
RUN which stockfish || (ls -la /usr/games/ && ln -s /usr/games/stockfish /usr/local/bin/stockfish) && \
    stockfish --help | head -1 || echo "Stockfish installed"

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config and package files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/engine-service/package.json ./packages/engine-service/

# Install dependencies
RUN pnpm install --frozen-lockfile=false

# Copy source code
COPY packages/contracts/ ./packages/contracts/
COPY packages/engine-service/ ./packages/engine-service/

# Build contracts first, then engine service
RUN pnpm --filter @master-academy/contracts build
RUN pnpm --filter @master-academy/engine-service build

WORKDIR /app/packages/engine-service

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]

FROM node:20-slim

WORKDIR /app

# Install dependencies for Stockfish and wget for healthcheck
RUN apt-get update && \
    apt-get install -y wget curl ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Download official Stockfish 17.1 binary from GitHub releases
# Using x86-64-sse41-popcnt for broader compatibility (works on most x64 CPUs)
# See: https://stockfishchess.org/download/
RUN curl -L -o /tmp/stockfish.tar \
    https://github.com/official-stockfish/Stockfish/releases/latest/download/stockfish-ubuntu-x86-64-sse41-popcnt.tar && \
    tar -xf /tmp/stockfish.tar -C /tmp && \
    mv /tmp/stockfish/stockfish-ubuntu-x86-64-sse41-popcnt /usr/local/bin/stockfish && \
    chmod +x /usr/local/bin/stockfish && \
    rm -rf /tmp/stockfish.tar /tmp/stockfish

# Verify Stockfish installation
RUN stockfish --version || echo "Stockfish installed" && which stockfish

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

FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config and package files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/game-api/package.json ./packages/game-api/

# Install dependencies
RUN pnpm install --frozen-lockfile=false

# Copy source code
COPY packages/contracts/ ./packages/contracts/
COPY packages/game-api/ ./packages/game-api/

# Build contracts first, then game-api
RUN pnpm --filter @master-academy/contracts build
RUN pnpm --filter @master-academy/game-api build

WORKDIR /app/packages/game-api

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]

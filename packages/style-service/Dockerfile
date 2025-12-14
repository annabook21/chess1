FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config and package files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/style-service/package.json ./packages/style-service/

# Install dependencies
RUN pnpm install --frozen-lockfile=false

# Copy source code
COPY packages/contracts/ ./packages/contracts/
COPY packages/style-service/ ./packages/style-service/

# Build contracts first, then style service
RUN pnpm --filter @master-academy/contracts build
RUN pnpm --filter @master-academy/style-service build

WORKDIR /app/packages/style-service

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1

CMD ["node", "dist/index.js"]

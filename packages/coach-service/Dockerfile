FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config and package files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/coach-service/package.json ./packages/coach-service/

# Install dependencies
RUN pnpm install --frozen-lockfile=false

# Copy source code
COPY packages/contracts/ ./packages/contracts/
COPY packages/coach-service/ ./packages/coach-service/

# Build contracts first, then coach service
RUN pnpm --filter @master-academy/contracts build
RUN pnpm --filter @master-academy/coach-service build

WORKDIR /app/packages/coach-service

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3003/health || exit 1

CMD ["node", "dist/index.js"]

FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config and package files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/drill-worker/package.json ./packages/drill-worker/

# Install dependencies
RUN pnpm install --frozen-lockfile=false

# Copy source code
COPY packages/contracts/ ./packages/contracts/
COPY packages/drill-worker/ ./packages/drill-worker/

# Build contracts first, then drill-worker
RUN pnpm --filter @master-academy/contracts build
RUN pnpm --filter @master-academy/drill-worker build

WORKDIR /app/packages/drill-worker

CMD ["node", "dist/index.js"]

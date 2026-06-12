# Build stage
FROM node:22.13-alpine AS builder

WORKDIR /app

# Copy package files and patches first
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install dependencies - skip frozen lockfile to allow pnpm to resolve dependencies
RUN npm install -g pnpm && pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Build the application with NODE_OPTIONS to handle esbuild
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm run build

# Production stage
FROM node:22.13-alpine

WORKDIR /app

# Copy package files and patches
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches

# Install production dependencies - skip frozen lockfile
RUN npm install -g pnpm && pnpm install --prod --no-frozen-lockfile

# Copy built files from builder
COPY --from=builder /app/dist ./dist
COPY server.js ./

# Expose port
EXPOSE 8080

# Start the application
# Zeabur redeploy trigger - modified to skip frozen lockfile
CMD ["node", "server.js"]

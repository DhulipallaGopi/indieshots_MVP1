# Final production Dockerfile - no Vite dependencies
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Update npm to latest version to support all flags
RUN npm install -g npm@latest

# Copy package files
COPY package*.json ./

# Install all dependencies for build (with fallback)
RUN npm ci --legacy-peer-deps || npm ci || npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Build backend with explicit exclusions
RUN npx esbuild server/index.ts \
    --platform=node \
    --packages=external \
    --bundle \
    --format=esm \
    --outdir=dist \
    --external:vite \
    --external:@vitejs/plugin-react \
    --external:@replit/vite-plugin-cartographer \
    --external:@replit/vite-plugin-runtime-error-modal

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Update npm to latest version
RUN npm install -g npm@latest

# Install only production dependencies (with fallback)
RUN npm ci --only=production --legacy-peer-deps || npm ci --only=production || npm install --only=production && \
    npm cache clean --force

# Copy built application and static files
COPY --from=builder /app/dist ./dist

# Copy production server
COPY --from=builder /app/server/index.production.ts ./server/
COPY shared ./shared

# Build production server without Vite dependencies
RUN npx esbuild server/index.production.ts \
    --platform=node \
    --packages=external \
    --bundle \
    --format=esm \
    --outfile=dist/server.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app

USER nextjs

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "http.get('http://localhost:8080/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
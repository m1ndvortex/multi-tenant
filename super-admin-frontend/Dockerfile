# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Add package manager lock files
COPY package.json package-lock.json* ./
RUN npm ci --only=production --frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Copy source and dependencies
COPY package.json package-lock.json* ./
RUN npm ci --frozen-lockfile

COPY . .

# Build application with optimizations
ENV NODE_ENV=production
RUN npm run build

# Production runtime stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Add curl for healthchecks
RUN apk add --no-cache curl dumb-init

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Install production dependencies
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

# Create necessary directories for volumes
RUN mkdir -p /app/.cache /app/logs && \
    chown -R nextjs:nodejs /app/.cache /app/logs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check with better error handling
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:3000/health || curl -fsS http://localhost:3000 || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# For development
FROM builder AS development
WORKDIR /app
ENV NODE_ENV=development
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# For production - serve static files with a simple server
FROM runner AS production
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "3000"]
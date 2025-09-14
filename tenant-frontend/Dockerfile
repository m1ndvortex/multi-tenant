# Multi-stage build for tenant frontend
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# Add curl for healthchecks
RUN apk add --no-cache curl

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development

# Install all dependencies (including dev dependencies)
RUN npm ci

# Copy source code
COPY . .

# Create necessary directories for volumes
RUN mkdir -p /app/dist /app/.cache

# Expose port
EXPOSE 3001

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:3001 || exit 1

# Start app in development mode with HMR
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Build stage
FROM base AS build

# Install all dependencies for building
RUN npm ci

# Copy source code
COPY . .

# Set production environment
ENV NODE_ENV=production
ENV VITE_APP_TYPE=tenant

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Install Node.js for serve command (lightweight option)
RUN apk add --no-cache nodejs npm

# Install serve globally
RUN npm install -g serve@14.2.1

# Copy built application
COPY --from=build /app/dist /app/dist

# Copy service worker
COPY --from=build /app/public/sw-realtime-cache.js /app/dist/sw-realtime-cache.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3001

# Health check for production
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:3001 || exit 1

# Start the production server
CMD ["serve", "-s", "/app/dist", "-l", "3001", "--no-clipboard"]
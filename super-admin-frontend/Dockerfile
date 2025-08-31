FROM node:18-alpine

# Set working directory
WORKDIR /app

# Add `/app/node_modules/.bin` to $PATH
ENV PATH /app/node_modules/.bin:$PATH

# Add curl for healthchecks
RUN apk add --no-cache curl

# Install app dependencies
COPY package.json ./
RUN npm install --silent

# Copy app source
COPY . ./

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -fsS http://localhost:3000 || exit 1

# Start app in development mode
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application
COPY . .

# Stage 2: Create the production image
FROM node:18-alpine

WORKDIR /app

# Copy necessary files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/index.html .
COPY --from=builder /app/js ./js
COPY --from=builder /app/pkc-docs ./pkc-docs
COPY --from=builder /app/pkc-docs-index.html .
COPY --from=builder /app/pkc-viewer.html .
COPY --from=builder /app/ws-server.js .

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production

# Start the application
CMD ["node", "ws-server.js"]

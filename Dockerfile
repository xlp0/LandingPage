# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

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
COPY --from=builder /app/modules.json .

# Install http-server to serve static files
RUN npm install -g http-server

# Expose the ports the app runs on
EXPOSE 3000 3001

# Start both the static file server and WebSocket server
CMD ["sh", "-c", "http-server -p 3000 & node ws-server.js"]

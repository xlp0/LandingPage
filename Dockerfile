# Use Node.js 18 Alpine as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Install http-server globally
RUN npm install -g http-server

# Copy the rest of the application
COPY . .

# Expose the ports the app runs on
EXPOSE 3000 3001

# Set environment variables
ENV NODE_ENV=production

# Start both servers
CMD ["sh", "-c", "http-server -p 3000 & node ws-server.js"]

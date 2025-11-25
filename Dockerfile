# Multi-stage build for optimized landing page
FROM nginx:alpine

# Set working directory
WORKDIR /usr/share/nginx/html

# Copy all landing page files
COPY landing-enhanced.html .
COPY landing.html .
COPY auth-callback-enhanced.html .
COPY auth-callback.html .
COPY config.js .
COPY js/ ./js/
COPY assets/ ./assets/

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/landing-enhanced.html || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
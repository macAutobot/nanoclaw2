# NanoClaw Main Application Dockerfile
# Personal Claude assistant that runs via WhatsApp

FROM node:22-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    sqlite3 \
    curl \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI (for container management)
RUN install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p groups data auth-store

# Expose port (if needed for webhooks or API)
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV CONTAINER_RUNTIME=docker

# Volume for persistent data
VOLUME ["/app/data", "/app/groups", "/app/auth-store"]

# Start the application
CMD ["npm", "start"]

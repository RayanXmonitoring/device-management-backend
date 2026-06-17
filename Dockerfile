# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (hanya sekali)
RUN npm ci --only=production

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p logs uploads

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Start the application (tanpa build atau postinstall)
CMD ["npm", "start"]

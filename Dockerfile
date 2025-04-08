# Use Node.js LTS version
FROM node:20-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD [ "node", "index.js" ] 
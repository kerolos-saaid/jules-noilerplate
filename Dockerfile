# Stage 1: Development
FROM node:20-alpine AS development

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including dev dependencies)
RUN npm install

# Copy the rest of the application source code
COPY . .

# Expose the application port
EXPOSE 3000

# Start the application in dev mode
CMD ["npm", "run", "start:dev"]

# Stage 2: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Stage 3: Create the production image
FROM node:20-alpine AS production

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --production

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]

#!/bin/bash

# Make script exit on first error
set -e

# Update repository
echo "Pulling latest changes..."
git pull origin main

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Build/prepare for production if needed
echo "Building for production..."

# Restart PM2 process
echo "Restarting PM2 process..."
npm run restart

echo "Deployment complete!" 
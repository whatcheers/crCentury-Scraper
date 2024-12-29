#!/bin/bash

# Exit on error
set -e

# Check if script is run with sudo
if [ "$(id -u)" != "0" ]; then 
    echo "Please run as root (sudo)"
    exit 1
fi

# Configuration
SOURCE_DIR="/home/whatcheer/crCentury-Scraper"
DEPLOY_DIR="/var/www/redditdev.cheesemonger.info"
APP_NAME="gazette-viewer"
DEPLOY_USER="www-data"
DEPLOY_GROUP="www-data"
PM2_HOME="/home/$DEPLOY_USER/.pm2"

echo "Starting production deployment..."

# Verify source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Source directory $SOURCE_DIR not found!"
    exit 1
fi

# Create deployment directory if it doesn't exist
sudo mkdir -p $DEPLOY_DIR

# Create and set up PM2 directories
echo "Setting up PM2 directories..."
sudo mkdir -p $PM2_HOME/{logs,pids}

# Initialize PM2 files with valid JSON
sudo bash -c "echo '{}' > $PM2_HOME/module_conf.json"
sudo touch $PM2_HOME/pm2.log
sudo touch $PM2_HOME/pm2.pid

# Set proper PM2 permissions
sudo chown -R $DEPLOY_USER:$DEPLOY_GROUP $PM2_HOME
sudo chmod -R 775 $PM2_HOME

# Copy necessary files from source directory
echo "Copying files to production directory..."
sudo cp -r $SOURCE_DIR/public $DEPLOY_DIR/
sudo cp $SOURCE_DIR/gazette-viewer.js $DEPLOY_DIR/
sudo cp $SOURCE_DIR/package.json $DEPLOY_DIR/
sudo cp $SOURCE_DIR/ecosystem.config.js $DEPLOY_DIR/

# Copy newspaper archives (date folders)
echo "Copying newspaper archives..."
for dir in $SOURCE_DIR/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]/; do
    if [ -d "$dir" ]; then
        base_dir=$(basename "$dir")
        echo "Copying $base_dir..."
        sudo cp -r "$dir" "$DEPLOY_DIR/"
    fi
done

# Set up BookReader assets
echo "Setting up BookReader..."
sudo mkdir -p $DEPLOY_DIR/public/bookreader/images
sudo cp $SOURCE_DIR/node_modules/bookreader/BookReader/BookReader.css $DEPLOY_DIR/public/bookreader/
sudo cp $SOURCE_DIR/node_modules/bookreader/BookReader/BookReader.js $DEPLOY_DIR/public/bookreader/
sudo cp $SOURCE_DIR/node_modules/bookreader/BookReader/jquery-3.js $DEPLOY_DIR/public/bookreader/
sudo cp $SOURCE_DIR/node_modules/bookreader/BookReader/webcomponents-bundle.js $DEPLOY_DIR/public/bookreader/
sudo cp -r $SOURCE_DIR/node_modules/bookreader/BookReader/images/* $DEPLOY_DIR/public/bookreader/images/

# Set proper ownership and permissions
echo "Setting permissions..."
sudo chown -R $DEPLOY_USER:$DEPLOY_GROUP $DEPLOY_DIR
sudo chmod -R 755 $DEPLOY_DIR

# Install PM2 globally
echo "Installing PM2 globally..."
sudo npm install -g pm2

# Install production dependencies only
echo "Installing production dependencies..."
cd $DEPLOY_DIR
sudo -u $DEPLOY_USER npm install --omit=dev

# Stop any existing PM2 processes
echo "Cleaning up existing PM2 processes..."
sudo -u $DEPLOY_USER bash -c "export PM2_HOME=$PM2_HOME && pm2 delete $APP_NAME" || true

# Start application with PM2
echo "Starting application with PM2..."
sudo -u $DEPLOY_USER bash -c "export PM2_HOME=$PM2_HOME && pm2 start ecosystem.config.js --env production"

# Save PM2 configuration
sudo -u $DEPLOY_USER bash -c "export PM2_HOME=$PM2_HOME && pm2 save"

# Setup PM2 startup script
echo "Setting up PM2 startup script..."
sudo -u $DEPLOY_USER bash -c "export PM2_HOME=$PM2_HOME && pm2 startup systemd -u $DEPLOY_USER --hp /home/$DEPLOY_USER"
sudo systemctl daemon-reload
sudo systemctl enable pm2-$DEPLOY_USER

# Reload nginx to apply security headers
echo "Reloading nginx configuration..."
sudo nginx -t && sudo systemctl reload nginx

echo "Deployment complete!"
echo "Application is now running at https://redditdev.cheesemonger.info"
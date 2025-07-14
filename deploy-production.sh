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

echo "Starting production deployment..."

# Verify source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Source directory $SOURCE_DIR not found!"
    exit 1
fi

# Create deployment directory if it doesn't exist
sudo mkdir -p $DEPLOY_DIR

# Stop existing service if running
echo "Stopping existing service..."
sudo systemctl stop $APP_NAME || true

# Copy necessary files from source directory
echo "Copying files to production directory..."
sudo cp -r $SOURCE_DIR/public $DEPLOY_DIR/
sudo cp -r $SOURCE_DIR/src $DEPLOY_DIR/
sudo cp $SOURCE_DIR/gazette-viewer.js $DEPLOY_DIR/
sudo cp $SOURCE_DIR/package.json $DEPLOY_DIR/

# Copy newspaper archives (date folders)
echo "Copying newspaper archives..."
for dir in $SOURCE_DIR/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]/; do
    if [ -d "$dir" ]; then
        base_dir=$(basename "$dir")
        echo "Copying $base_dir..."
        sudo cp -r "$dir" "$DEPLOY_DIR/"
    fi
done

# Set up BookReader assets (if package exists)
if [ -d "$SOURCE_DIR/node_modules/bookreader" ]; then
echo "Setting up BookReader..."
sudo mkdir -p $DEPLOY_DIR/public/bookreader/images
    sudo cp $SOURCE_DIR/node_modules/bookreader/BookReader/BookReader.css $DEPLOY_DIR/public/bookreader/ || true
    sudo cp $SOURCE_DIR/node_modules/bookreader/BookReader/BookReader.js $DEPLOY_DIR/public/bookreader/ || true
    sudo cp $SOURCE_DIR/node_modules/bookreader/BookReader/jquery-3.js $DEPLOY_DIR/public/bookreader/ || true
    sudo cp $SOURCE_DIR/node_modules/bookreader/BookReader/webcomponents-bundle.js $DEPLOY_DIR/public/bookreader/ || true
    sudo cp -r $SOURCE_DIR/node_modules/bookreader/BookReader/images/* $DEPLOY_DIR/public/bookreader/images/ || true
else
    echo "BookReader package not found, skipping..."
fi

# Set proper ownership and permissions
echo "Setting permissions..."
sudo chown -R $DEPLOY_USER:$DEPLOY_GROUP $DEPLOY_DIR
sudo chmod -R 755 $DEPLOY_DIR

# Install production dependencies only
echo "Installing production dependencies..."
cd $DEPLOY_DIR
sudo -u $DEPLOY_USER npm install --omit=dev

# Create systemd service file
echo "Creating systemd service..."
sudo tee /etc/systemd/system/$APP_NAME.service > /dev/null <<EOF
[Unit]
Description=Gazette Viewer - Cedar Rapids Historical Newspaper Archive
After=network.target

[Service]
Type=simple
User=$DEPLOY_USER
Group=$DEPLOY_GROUP
WorkingDirectory=$DEPLOY_DIR
ExecStart=/usr/bin/node gazette-viewer.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable $APP_NAME

# Start the service
echo "Starting $APP_NAME service..."
sudo systemctl start $APP_NAME

# Reload nginx to apply security headers
echo "Reloading nginx configuration..."
sudo nginx -t && sudo systemctl reload nginx

echo "Deployment complete!"
echo "Application is now running at https://redditdev.cheesemonger.info"
echo "Service status:"
sudo systemctl status $APP_NAME --no-pager -l
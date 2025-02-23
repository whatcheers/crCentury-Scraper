#!/bin/bash

# Log file setup
LOG_DIR="/home/whatcheer/crCentury-Scraper/logs"
LOG_FILE="$LOG_DIR/scraper-$(date +%Y-%m-%d).log"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Change to the project directory
cd /home/whatcheer/crCentury-Scraper

# Start logging
log_message "Startng automated scraping process"

# Run the scraper
log_message "Running gazette scraper"
node gazette-scraper-100years.js >> "$LOG_FILE" 2>&1

# Check if scraper was successful
if [ $? -eq 0 ]; then
    log_message "Scraper completed successfully"
    
    # Run deployment script
    log_message "Starting deployment process"
    sudo sh deploy-production.sh >> "$LOG_FILE" 2>&1
    
    if [ $? -eq 0 ]; then
        log_message "Deployment completed successfully"
    else
        log_message "ERROR: Deployment failed"
        exit 1
    fi
else
    log_message "ERROR: Scraper failed"
    exit 1
fi

# Cleanup old logs (keep last 30 days)
find "$LOG_DIR" -name "scraper-*.log" -type f -mtime +30 -delete

log_message "Process completed" 
#!/bin/bash

# Exit on error
set -e

# Log file setup
LOG_DIR="/home/whatcheer/crCentury-Scraper/logs"
LOG_FILE="$LOG_DIR/scraper-$(date +%Y-%m-%d).log"
ERROR_LOG="$LOG_DIR/scraper-error-$(date +%Y-%m-%d).log"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to log errors
log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" -a "$ERROR_LOG"
}

# Change to the project directory
cd /home/whatcheer/crCentury-Scraper

# Start logging
log_message "Starting automated scraping process"

# Run the scraper with timeout (3 hours max)
log_message "Running gazette scraper"
timeout 3h node gazette-scraper-100years.js >> "$LOG_FILE" 2>&1
SCRAPER_EXIT_CODE=$?

# Check if scraper was successful
if [ $SCRAPER_EXIT_CODE -eq 0 ]; then
    log_message "Scraper completed successfully"
    
    # Run deployment script - using a wrapper that will be configured in sudoers
    log_message "Starting deployment process"
    ./deploy-wrapper.sh >> "$LOG_FILE" 2>&1
    DEPLOY_EXIT_CODE=$?
    
    if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
        log_message "Deployment completed successfully"
        
        # Send success notification (optional)
        log_message "Sending success notification"
        echo "Gazette scraper and deployment completed successfully on $(date)" | mail -s "Gazette Scraper Success" root
    else
        log_error "Deployment failed with exit code $DEPLOY_EXIT_CODE"
        echo "Gazette deployment failed on $(date). Check logs at $LOG_FILE" | mail -s "Gazette Deployment Failed" root
        exit 1
    fi
elif [ $SCRAPER_EXIT_CODE -eq 124 ]; then
    log_error "Scraper timed out after 3 hours"
    echo "Gazette scraper timed out after 3 hours on $(date). Check logs at $LOG_FILE" | mail -s "Gazette Scraper Timeout" root
    exit 1
else
    log_error "Scraper failed with exit code $SCRAPER_EXIT_CODE"
    echo "Gazette scraper failed on $(date). Check logs at $LOG_FILE" | mail -s "Gazette Scraper Failed" root
    exit 1
fi

# Cleanup old logs (keep last 30 days)
find "$LOG_DIR" -name "scraper-*.log" -type f -mtime +30 -delete
find "$LOG_DIR" -name "scraper-error-*.log" -type f -mtime +30 -delete

log_message "Process completed" 
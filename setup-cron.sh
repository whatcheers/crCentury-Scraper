#!/bin/bash

# This script sets up a cron job to run the gazette scraper every Sunday at 1 AM

# Log file for setup
LOG_FILE="cron-setup.log"

echo "Setting up cron job for gazette scraper..." | tee -a "$LOG_FILE"

# Get the absolute path to the automate-scraper.sh script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTOMATE_SCRIPT="$SCRIPT_DIR/automate-scraper.sh"

# Make sure the automation script is executable
chmod +x "$AUTOMATE_SCRIPT"

# Create a temporary file for the crontab
TEMP_CRONTAB=$(mktemp)

# Export current crontab
crontab -l > "$TEMP_CRONTAB" 2>/dev/null || echo "# New crontab" > "$TEMP_CRONTAB"

# Check if the cron job already exists
if grep -q "$AUTOMATE_SCRIPT" "$TEMP_CRONTAB"; then
    echo "Cron job already exists. Updating..." | tee -a "$LOG_FILE"
    # Remove existing cron job
    sed -i "\|$AUTOMATE_SCRIPT|d" "$TEMP_CRONTAB"
fi

# Add the new cron job (run every Sunday at 1 AM)
echo "0 1 * * 0 $AUTOMATE_SCRIPT" >> "$TEMP_CRONTAB"

# Install the new crontab
crontab "$TEMP_CRONTAB"

# Clean up
rm "$TEMP_CRONTAB"

echo "Cron job setup complete. The gazette scraper will run every Sunday at 1 AM." | tee -a "$LOG_FILE"
echo "To verify, run: crontab -l" | tee -a "$LOG_FILE" 
#!/bin/bash

# This script sets up a sudoers entry to allow the current user to run
# the deploy-wrapper.sh script without a password.

# Check if script is run with sudo
if [ "$(id -u)" != "0" ]; then 
    echo "This script must be run with sudo (sudo ./setup-sudoers.sh)"
    exit 1
fi

# Get the current username
CURRENT_USER=$(logname || whoami)
echo "Setting up sudoers entry for user: $CURRENT_USER"

# Get the absolute path to the deploy-production.sh script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy-production.sh"

# Make sure the deploy-wrapper.sh script is executable
chmod +x "$SCRIPT_DIR/deploy-wrapper.sh"

# Create the sudoers entry
SUDOERS_ENTRY="$CURRENT_USER ALL=(ALL) NOPASSWD: $DEPLOY_SCRIPT"

# Check if the entry already exists
if sudo grep -q "$DEPLOY_SCRIPT" /etc/sudoers; then
    echo "Sudoers entry already exists."
else
    # Add the entry to the sudoers file
    echo "$SUDOERS_ENTRY" | sudo tee -a /etc/sudoers > /dev/null
    echo "Sudoers entry added successfully."
fi

echo "Setup complete. The user $CURRENT_USER can now run the deployment script without a password."
echo "To test, run: sudo -l" 
#!/bin/bash

# This is a simple wrapper script that will be configured in sudoers
# to allow running the deployment script with elevated privileges
# without requiring a password during automated execution.

# Path to the actual deployment script
DEPLOY_SCRIPT="/home/whatcheer/crCentury-Scraper/deploy-production.sh"

# Execute the deployment script with sudo
sudo "$DEPLOY_SCRIPT"
exit $? 
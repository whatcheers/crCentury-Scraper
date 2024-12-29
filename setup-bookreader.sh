#!/bin/bash

# Create directories
mkdir -p public/bookreader/images

# Copy core files
cp node_modules/bookreader/BookReader/BookReader.css public/bookreader/
cp node_modules/bookreader/BookReader/BookReader.js public/bookreader/
cp node_modules/bookreader/BookReader/jquery-3.js public/bookreader/
cp node_modules/bookreader/BookReader/webcomponents-bundle.js public/bookreader/

# Copy images
cp -r node_modules/bookreader/BookReader/images/* public/bookreader/images/

echo "BookReader files copied successfully" 
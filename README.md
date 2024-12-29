# Cedar Rapids Evening Gazette Scraper (100 Years Ago)

A tool to scrape and display historical newspapers from the Cedar Rapids Evening Gazette archive, specifically targeting public domain editions from 100 years ago. 

See live example: [redditdev.cheesemonger.info](https://redditdev.cheesemonger.info)

Support the project:
[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/dbsurplussolutions)

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github)](https://github.com/whatcheer/crCentury-Scraper)

## Features

- Downloads newspaper pages from Cedar Rapids Evening Gazette archives (100 years ago)
- Converts PDFs to high-quality PNG images (600 DPI)
- Simple web viewer for browsing the archive
- Organizes content by date in a clean directory structure
- Combines pages into complete editions
- Flexible date targeting:
  - Week numbers (1-52)
  - Specific dates (MM-DD format)
  - Current week by default

## Prerequisites (Tested on Ubuntu 24.04)

- Node.js (v18 or higher)
- GraphicsMagick (`sudo apt-get install graphicsmagick`)
- Ghostscript (`sudo apt-get install ghostscript`)

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd crCentury-Scraper
```

2. Install dependencies:
```bash
npm install
```

3. Install system requirements (on Linux/Ubuntu):
```bash
# Update and install main applications
sudo apt-get update
sudo apt-get install graphicsmagick ghostscript
```

## Running the App

### Downloading Papers

You have several options for downloading papers from 100 years ago:

1. **Current Week** (default):
```bash
node gazette-scraper-100years.js
```
Downloads the current week's papers from 100 years ago, starting from Sunday.

2. **Specific Week Number**:
```bash
node gazette-scraper-100years.js --week 51
# or
node gazette-scraper-100years.js --week=51
```
Downloads papers from a specific week (1-52) from 100 years ago. Week 1 starts with the first Sunday of the year.

3. **Specific Day**:
```bash
node gazette-scraper-100years.js --day 12-25
# or
node gazette-scraper-100years.js --day=12-25
```
Downloads a specific day's paper (format: MM-DD) from 100 years ago. Please respect the bandwidth of the archives.

Each download will:
- Create a dated folder (e.g., "1924-12-25")
- Download all pages as PDFs
- Convert them to high-quality PNG images
- Store everything in the dated folder

### Viewing the Archive

1. Start the viewer:
```bash
node gazette-viewer.js
```

2. Open your web browser
3. Go to: `http://localhost:3200`
4. Browse available dates and choose viewing format:
   - View as Images (high-quality PNG)
   - View as PDFs (original format)

The viewer provides:
- Dark/Light theme toggle
- Mobile-friendly interface
- Zoom controls for images and PDFs
- Easy navigation between pages

## Directory Structure

```
crCentury-Scraper/
├── YYYY-MM-DD/           # Date-based folders
│   ├── images/          # Converted PNG images
│   ├── page_XX.pdf     # Individual page PDFs
│   └── Complete.pdf    # Combined issue
├── public/
│   ├── css/            # Styling
│   └── js/             # JavaScript files
└── node_modules/       # Dependencies
```

## Support

This is an open source project. Feel free to contribute by submitting issues, feature requests, or pull requests on GitHub.

## License

MIT

## Acknowledgments

- Cedar Rapids Public Library
- Advantage Archives for maintaining the digital archive
- CR Gazette for the original newspaper

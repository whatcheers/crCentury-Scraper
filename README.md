# Cedar Rapids Evening Gazette Scraper (100 Years Ago)

A tool to scrape and display historical newspapers from the Cedar Rapids Evening Gazette archive, specifically targeting public domain editions from 100 years ago. 

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/dbsurplussolutions)

## Features

- Downloads newspaper pages from Cedar Rapids Evening Gazette archives (100 years ago)
- Converts PDFs to high-quality PNG images (600 DPI)
- Simple web viewer for browsing the archive
- Organizes content by date in a clean directory structure
- Combines pages into complete editions

## Prerequisites

- Node.js (v14 or higher)
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
sudo apt-get update
sudo apt-get install graphicsmagick
sudo apt-get install ghostscript
```

## Running the App

### Step 1: Download Today's Paper (from 100 years ago)
To download today's edition from 100 years ago:
```bash
node gazette-scraper-100years.js
```

This will:
- Create a dated folder (e.g., "1924-12-29")
- Download all pages as PDFs
- Convert them to high-quality PNG images
- Store everything in the dated folder

### Step 2: Start the Viewer
Once the download is complete, start the viewer:
```bash
node gazette-viewer.js
```

### Step 3: View the Paper
1. Open your web browser
2. Go to: `http://localhost:3000`
3. Click on the date you want to view
4. Use arrow keys to navigate between pages

### Additional Options

To download an entire week's worth of papers (from 100 years ago):
```bash
node gazette-scraper-100years.js --week
```

## Directory Structure

After running, you'll see:
```
.
└── YYYY-MM-DD/          # Date folder (e.g., 1924-12-29)
    ├── images/          # Contains the PNG images
    │   ├── page_01.png
    │   ├── page_02.png
    │   └── ...
    ├── page_01.pdf     # Original PDFs
    ├── page_02.pdf
    └── ...
```

## Contributing

Feel free to submit issues and enhancement requests.

## License

MIT

## Support

If you find this tool useful, consider supporting the development:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/dbsurplussolutions)

## Acknowledgments

- Cedar Rapids Public Library
- Advantage Archives for maintaining the digital archive
- CR Gazette for the original newspaper

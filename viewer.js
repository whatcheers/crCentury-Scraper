const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = process.env.PORT || 6969;

// Serve static files
app.use('/BookReader', express.static(path.join(__dirname, 'node_modules/bookreader/BookReader')));
app.use('/src', express.static(path.join(__dirname, 'node_modules/bookreader/src')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.get('/', async (req, res) => {
    try {
        const imagesDir = path.join(__dirname, 'images');
        
        // Check if images directory exists
        try {
            await fs.access(imagesDir);
        } catch (error) {
            return res.send('No newspapers have been processed yet. Please run the scraper first.');
        }

        // Get list of image files
        const imageFiles = (await fs.readdir(imagesDir))
            .filter(file => file.endsWith('.jpg'))
            .sort((a, b) => {
                const pageA = parseInt(a.match(/Page(\d+)/)[1]);
                const pageB = parseInt(b.match(/Page(\d+)/)[1]);
                return pageA - pageB;
            });

        if (imageFiles.length === 0) {
            return res.send('No newspapers available yet.');
        }

        // Extract date from first image filename
        const dateMatch = imageFiles[0].match(/(\d{4})-(\d{2})-(\d{2})/);
        if (!dateMatch) {
            return res.status(500).send('Error parsing newspaper date');
        }
        const [_, year, month, day] = dateMatch;

        const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Cedar Rapids Evening Gazette - ${month}/${day}/${year}</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <script src="/BookReader/jquery-1.10.1.js"></script>
                    <script src="/BookReader/jquery-ui-1.12.0.min.js"></script>
                    <script src="/BookReader/jquery.browser.min.js"></script>
                    <script src="/BookReader/dragscrollable-br.js"></script>
                    <script src="/BookReader/jquery.colorbox-min.js"></script>
                    <script src="/BookReader/BookReader.js"></script>
                    <link rel="stylesheet" href="/BookReader/BookReader.css"/>
                </head>
                <body style="margin: 0; padding: 0;">
                    <div id="BookReader"></div>
                    <script>
                        var options = {
                            data: [${imageFiles.map(file => `[{
                                width: 1200,
                                height: 1800,
                                uri: '/images/${encodeURIComponent(file)}'
                            }]`).join(',')}],
                            
                            bookTitle: 'Cedar Rapids Evening Gazette - ${month}/${day}/${year}',
                            
                            metadata: [
                                {label: 'Date', value: '${month}/${day}/${year}'},
                                {label: 'Source', value: 'Cedar Rapids Evening Gazette'}
                            ],

                            ui: 'full',
                            defaults: 'mode/1up',
                            enableMobileNav: true,
                            enableThumbnails: true,
                            enableSearch: false,
                            enableUrlPlugin: true
                        };

                        var br = new BookReader(options);
                        br.init();
                    </script>
                </body>
            </html>
        `;
        res.send(html);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error loading viewer: ' + error.message);
    }
});

app.listen(port, () => {
    console.log(`Viewer running at http://localhost:${port}`);
}); 
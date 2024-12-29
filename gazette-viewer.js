const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = 3000;

// Cache middleware for static files
const cacheControl = (req, res, next) => {
    // Cache PDFs and images for 1 day
    if (req.path.endsWith('.pdf') || req.path.endsWith('.png')) {
        res.set('Cache-Control', 'public, max-age=86400');
    }
    next();
};

// Serve static files from root directory with caching
app.use(cacheControl);
app.use(express.static('.'));

// Main page - shows list of available dates
app.get('/', async (req, res) => {
    try {
        const dirs = await fs.readdir('.');
        const dateDirs = (await Promise.all(
            dirs.map(async dir => {
                try {
                    const stat = await fs.stat(dir);
                    if (stat.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(dir)) {
                        // Check for PDFs and images
                        const files = await fs.readdir(dir);
                        const pdfs = files.filter(f => f.endsWith('.pdf'));
                        const hasImages = await fs.access(path.join(dir, 'images'))
                            .then(() => true)
                            .catch(() => false);
                        return { date: dir, pdfs, hasImages };
                    }
                    return null;
                } catch (err) {
                    return null;
                }
            })
        )).filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cedar Rapids Evening Gazette Archive</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
                <style>
                    body { 
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 0 auto;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    h1 { 
                        color: #333;
                        border-bottom: 2px solid #333;
                        padding-bottom: 10px;
                    }
                    .date-list {
                        list-style: none;
                        padding: 0;
                    }
                    .date-list li {
                        margin: 10px 0;
                        padding: 15px;
                        background: white;
                        border-radius: 5px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    }
                    .date-header {
                        font-size: 1.2em;
                        color: #333;
                        margin-bottom: 10px;
                    }
                    .format-options {
                        display: flex;
                        gap: 10px;
                        flex-direction: column;
                    }
                    .format-button {
                        display: inline-flex;
                        align-items: center;
                        padding: 8px 16px;
                        background: #2c5282;
                        color: white;
                        text-decoration: none;
                        border-radius: 4px;
                        font-size: 0.9em;
                    }
                    .format-button:hover {
                        background: #2a4365;
                    }
                    .format-button.pdf {
                        background: #c53030;
                    }
                    .format-button.pdf:hover {
                        background: #9b2c2c;
                    }
                    .format-button i {
                        margin-right: 8px;
                    }
                </style>
            </head>
            <body>
                <h1>Cedar Rapids Evening Gazette Archive</h1>
                <ul class="date-list">
                    ${dateDirs.map(dir => `
                        <li>
                            <div class="date-header">${dir.date}</div>
                            <div class="format-options">
                                ${dir.hasImages ? `
                                    <a href="/view/${dir.date}" class="format-button">
                                        <i class="fas fa-images"></i>
                                        View Images
                                    </a>
                                ` : ''}
                                ${dir.pdfs.length > 0 ? `
                                    <div class="pdf-list">
                                        <a href="/view-pdfs/${dir.date}" class="format-button pdf">
                                            <i class="fas fa-file-pdf"></i>
                                            View PDFs (${dir.pdfs.length} pages)
                                        </a>
                                    </div>
                                ` : ''}
                            </div>
                        </li>
                    `).join('')}
                </ul>
            </body>
            </html>
        `;
        res.send(html);
    } catch (err) {
        res.status(500).send('Error loading archive: ' + err.message);
    }
});

// View specific date
app.get('/view/:date', async (req, res) => {
    try {
        const date = req.params.date;
        const imagesDir = path.join(date, 'images');
        const files = await fs.readdir(imagesDir);
        const images = files.filter(f => f.endsWith('.png')).sort();

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Gazette - ${date}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: #1a1a1a;
                        color: white;
                        font-family: Arial, sans-serif;
                        min-height: 100vh;
                        overscroll-behavior: none;
                    }
                    .controls {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: rgba(0,0,0,0.9);
                        padding: 12px;
                        z-index: 1000;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .controls a, .controls button {
                        color: white;
                        text-decoration: none;
                        background: #2c5282;
                        padding: 12px;
                        border-radius: 8px;
                        cursor: pointer;
                        border: none;
                        font-size: 18px;
                        min-width: 48px;
                        min-height: 48px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        -webkit-tap-highlight-color: transparent;
                        touch-action: manipulation;
                    }
                    .controls button:active {
                        background: #2a4365;
                        transform: scale(0.95);
                    }
                    .viewer {
                        padding: 0;
                        margin: 0;
                        -webkit-overflow-scrolling: touch;
                    }
                    .page-container {
                        margin: 0 auto;
                        width: 100%;
                        position: relative;
                        touch-action: pan-y pinch-zoom;
                    }
                    img {
                        width: 100%;
                        height: auto;
                        display: block;
                        margin: 0 auto;
                        touch-action: pan-y pinch-zoom;
                        -webkit-user-select: none;
                        user-select: none;
                    }
                    .page-number {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: rgba(0,0,0,0.7);
                        color: white;
                        padding: 5px 10px;
                        border-radius: 4px;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="viewer" id="viewer">
                    ${images.map((image, index) => `
                        <div class="page-container" data-page="${index + 1}">
                            <img src="/${path.join(date, 'images', image)}" 
                                 alt="Page ${image.replace(/\D/g, '')}"
                                 loading="lazy">
                            <div class="page-number">Page ${image.replace(/\D/g, '')}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="controls">
                    <a href="/" class="button">
                        <i class="fas fa-arrow-left"></i>
                    </a>
                    <div class="zoom-controls">
                        <button onclick="zoomOut()">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button onclick="resetZoom()">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button onclick="zoomIn()">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <script>
                    let currentScale = 1;
                    let initialDistance = 0;
                    
                    // Touch handling
                    document.addEventListener('touchstart', (e) => {
                        if (e.touches.length === 2) {
                            initialDistance = Math.hypot(
                                e.touches[0].pageX - e.touches[1].pageX,
                                e.touches[0].pageY - e.touches[1].pageY
                            );
                        }
                    });

                    document.addEventListener('touchmove', (e) => {
                        if (e.touches.length === 2) {
                            const currentDistance = Math.hypot(
                                e.touches[0].pageX - e.touches[1].pageX,
                                e.touches[0].pageY - e.touches[1].pageY
                            );
                            
                            if (initialDistance > 0) {
                                const scale = currentDistance / initialDistance;
                                if (scale > 1.1) {
                                    zoomIn();
                                    initialDistance = currentDistance;
                                } else if (scale < 0.9) {
                                    zoomOut();
                                    initialDistance = currentDistance;
                                }
                            }
                        }
                    });

                    document.addEventListener('touchend', () => {
                        initialDistance = 0;
                    });
                    
                    function zoomIn() {
                        currentScale = Math.min(currentScale * 1.2, 3);
                        applyZoom();
                    }

                    function zoomOut() {
                        currentScale = Math.max(currentScale * 0.8, 0.5);
                        applyZoom();
                    }

                    function resetZoom() {
                        currentScale = 1;
                        applyZoom();
                    }

                    function applyZoom() {
                        const containers = document.querySelectorAll('.page-container');
                        containers.forEach(container => {
                            const img = container.querySelector('img');
                            img.style.transform = \`scale(\${currentScale})\`;
                        });
                    }
                </script>
            </body>
            </html>
        `;
        res.send(html);
    } catch (err) {
        res.status(500).send('Error loading images: ' + err.message);
    }
});

// View PDFs for a specific date
app.get('/view-pdfs/:date', async (req, res) => {
    try {
        const date = req.params.date;
        const files = await fs.readdir(date);
        const pdfs = files.filter(f => f.endsWith('.pdf')).sort((a, b) => {
            const pageA = parseInt(a.match(/page_(\d+)/)[1]);
            const pageB = parseInt(b.match(/page_(\d+)/)[1]);
            return pageA - pageB;
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Gazette PDFs - ${date}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: #1a1a1a;
                        color: white;
                        font-family: Arial, sans-serif;
                        min-height: 100vh;
                        overscroll-behavior: none;
                    }
                    .controls {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: rgba(0,0,0,0.9);
                        padding: 12px;
                        z-index: 1000;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .controls a, .controls button {
                        color: white;
                        text-decoration: none;
                        background: #2c5282;
                        padding: 12px;
                        border-radius: 8px;
                        cursor: pointer;
                        border: none;
                        font-size: 18px;
                        min-width: 48px;
                        min-height: 48px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        -webkit-tap-highlight-color: transparent;
                        touch-action: manipulation;
                    }
                    .controls button:active {
                        background: #2a4365;
                        transform: scale(0.95);
                    }
                    .viewer {
                        padding: 0;
                        margin: 0;
                        -webkit-overflow-scrolling: touch;
                    }
                    .page-container {
                        margin: 0 auto;
                        width: 100%;
                        height: 100vh;
                        position: relative;
                        touch-action: pan-y pinch-zoom;
                    }
                    embed {
                        width: 100%;
                        height: 100%;
                        display: block;
                        background: white;
                    }
                    .page-number {
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: rgba(0,0,0,0.7);
                        color: white;
                        padding: 5px 10px;
                        border-radius: 4px;
                        font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <div class="viewer" id="viewer">
                    ${pdfs.map((pdf, index) => `
                        <div class="page-container" data-page="${index + 1}">
                            <embed src="/${path.join(date, pdf)}" 
                                   type="application/pdf">
                            <div class="page-number">Page ${parseInt(pdf.match(/page_(\d+)/)[1])}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="controls">
                    <a href="/" class="button">
                        <i class="fas fa-arrow-left"></i>
                    </a>
                    <div class="zoom-controls">
                        <button onclick="zoomOut()">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button onclick="resetZoom()">
                            <i class="fas fa-undo"></i>
                        </button>
                        <button onclick="zoomIn()">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <script>
                    let currentScale = 1;
                    let initialDistance = 0;
                    
                    // Touch handling
                    document.addEventListener('touchstart', (e) => {
                        if (e.touches.length === 2) {
                            initialDistance = Math.hypot(
                                e.touches[0].pageX - e.touches[1].pageX,
                                e.touches[0].pageY - e.touches[1].pageY
                            );
                        }
                    });

                    document.addEventListener('touchmove', (e) => {
                        if (e.touches.length === 2) {
                            const currentDistance = Math.hypot(
                                e.touches[0].pageX - e.touches[1].pageX,
                                e.touches[0].pageY - e.touches[1].pageY
                            );
                            
                            if (initialDistance > 0) {
                                const scale = currentDistance / initialDistance;
                                if (scale > 1.1) {
                                    zoomIn();
                                    initialDistance = currentDistance;
                                } else if (scale < 0.9) {
                                    zoomOut();
                                    initialDistance = currentDistance;
                                }
                            }
                        }
                    });

                    document.addEventListener('touchend', () => {
                        initialDistance = 0;
                    });
                    
                    function zoomIn() {
                        currentScale = Math.min(currentScale * 1.2, 3);
                        applyZoom();
                    }

                    function zoomOut() {
                        currentScale = Math.max(currentScale * 0.8, 0.5);
                        applyZoom();
                    }

                    function resetZoom() {
                        currentScale = 1;
                        applyZoom();
                    }

                    function applyZoom() {
                        const containers = document.querySelectorAll('.page-container');
                        containers.forEach(container => {
                            const pdf = container.querySelector('embed');
                            pdf.style.transform = \`scale(\${currentScale})\`;
                            pdf.style.transformOrigin = 'top center';
                        });
                    }
                </script>
            </body>
            </html>
        `;
        res.send(html);
    } catch (err) {
        res.status(500).send('Error loading PDFs: ' + err.message);
    }
});

app.listen(port, () => {
    console.log(`Gazette viewer running at http://localhost:${port}`);
}); 
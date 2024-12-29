const express = require('express');
const path = require('path');
const fs = require('fs').promises;

const app = express();
const port = 3200;

// Cache middleware for static files
const cacheControl = (req, res, next) => {
    if (req.path.endsWith('.pdf') || req.path.endsWith('.png') || req.path.endsWith('.css')) {
        res.set('Cache-Control', 'public, max-age=86400');
    }
    next();
};

// Serve static files from public directory with caching
app.use(cacheControl);
app.use(express.static('public'));
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
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Sans+Pro:wght@400;600&display=swap" rel="stylesheet">
                <link rel="stylesheet" href="/css/styles.css">
            </head>
            <body>
                <header>
                    <div class="container">
                        <h1>Cedar Rapids Evening Gazette Archive</h1>
                        <div class="subtitle">Exploring History from 100 Years Ago</div>
                    </div>
                </header>

                <div class="container">
                    <section class="history-section">
                        <h2>About The Evening Gazette</h2>
                        <p>The Evening Gazette was a prominent daily newspaper based in Cedar Rapids, Iowa, first published on January 10, 1883. Initially known by this title, the paper later underwent name changes, including Cedar Rapids Evening Gazette and Evening Gazette and Republican, before becoming The Gazette.</p>
                        <p>It served the northeastern and east-central Iowa regions, including the Cedar Rapids and Iowa City metropolitan areas, as a significant source of local news and information. Published from 1883 to 1912, the paper continued under different titles thereafter.</p>
                        <p>Historical editions of the Evening Gazette are preserved in various archives, including the Cedar Rapids Public Library Community History Archive, Chronicling America, and NewspaperArchive.com. These resources provide valuable access to its historical content, making it a vital resource for researchers, genealogists, and history enthusiasts interested in Cedar Rapids' regional history.</p>
                    </section>

                    <h2>Available Archives</h2>
                    <ul class="date-list">
                        ${dateDirs.map(dir => `
                            <li>
                                <div class="date-header">${new Date(dir.date).toLocaleDateString('en-US', { 
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}</div>
                                <div class="format-options">
                                    ${dir.hasImages ? `
                                        <a href="/view/${dir.date}" class="format-button">
                                            <i class="fas fa-images"></i>
                                            View Images
                                        </a>
                                    ` : ''}
                                    ${dir.pdfs.length > 0 ? `
                                        <a href="/view-pdfs/${dir.date}" class="format-button pdf">
                                            <i class="fas fa-file-pdf"></i>
                                            View PDFs (${dir.pdfs.length} pages)
                                        </a>
                                    ` : ''}
                                </div>
                            </li>
                        `).join('')}
                    </ul>

                    <div class="support-section">
                        <p>If you find this archive valuable, consider supporting its development:</p>
                        <a href="https://ko-fi.com/dbsurplussolutions">
                            <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Support on Ko-fi">
                        </a>
                    </div>
                </div>

                <footer>
                    <div class="container">
                        <p>Data sourced from Cedar Rapids Public Library Community History Archive</p>
                        <p>© ${new Date().getFullYear()} Archive Project</p>
                    </div>
                </footer>
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
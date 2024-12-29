const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const rateLimit = require('express-rate-limit');
const serveStatic = require('serve-static');

const app = express();
const port = process.env.PORT || 3200;
const BASE_PATH = process.env.BASE_PATH || path.resolve('.');

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // limit each IP to 500 requests per windowMs (increased from 100)
    message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiting to all routes
app.use(limiter);

// Cache middleware for static files
const cacheControl = (req, res, next) => {
    if (req.path.endsWith('.pdf') || req.path.endsWith('.png') || req.path.endsWith('.css') || req.path.endsWith('.js')) {
        // Cache for 30 days
        res.set('Cache-Control', 'public, max-age=2592000');
    }
    next();
};

// Serve static files from public directory with caching
app.use(cacheControl);
app.use(serveStatic('public', {
    setHeaders: (res, path) => {
        // Set correct MIME types
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
        }
    }
}));
app.use(serveStatic(BASE_PATH, {
    setHeaders: (res, path) => {
        if (path.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
        }
    }
}));

// Direct date URL handling
app.get('/:date', async (req, res, next) => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (datePattern.test(req.params.date)) {
        res.redirect(`/view/${req.params.date}`);
    } else {
        next();
    }
});

// Main page - shows list of available dates
app.get('/', async (req, res) => {
    try {
        const dirs = await fs.readdir(BASE_PATH);
        const dateDirs = (await Promise.all(
            dirs.map(async dir => {
                try {
                    const stat = await fs.stat(path.join(BASE_PATH, dir));
                    if (stat.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(dir)) {
                        const files = await fs.readdir(path.join(BASE_PATH, dir));
                        const pdfs = files.filter(f => f.endsWith('.pdf'));
                        const hasImages = await fs.access(path.join(BASE_PATH, dir, 'images'))
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
            <html lang="en">
            <head>
                <title>CRHistoryPorn's 100-Year Archive Explorer</title>
                <meta name="description" content="Historical newspaper viewer for The Evening Gazette from Cedar Rapids, Iowa - 100 years ago">
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Source+Sans+Pro:wght@400;600&display=swap" rel="stylesheet">
                <link rel="stylesheet" href="/css/styles.css">
                <script src="/js/theme.js" defer></script>
            </head>
            <body>
                <button class="theme-toggle" aria-label="Toggle dark mode">
                    <i class="fas fa-moon" aria-hidden="true"></i>
                </button>

                <header role="banner">
                    <div class="container">
                        <h1>CRHistoryPorn's 100-Year Archive Explorer</h1>
                        <div class="subtitle" role="doc-subtitle">Exploring Cedar Rapids History Through The Evening Gazette - 100 Years Ago Today</div>
                    </div>
                </header>

                <main role="main">
                    <div class="container">
                        <section class="history-section" aria-labelledby="about-heading">
                            <h2 id="about-heading">About The Evening Gazette</h2>
                            <p>The Evening Gazette was a prominent daily newspaper based in Cedar Rapids, Iowa, first published on January 10, 1883. Initially known by this title, the paper later underwent name changes, including Cedar Rapids Evening Gazette and Evening Gazette and Republican, before becoming The Gazette.</p>
                            <p>It served the northeastern and east-central Iowa regions, including the Cedar Rapids and Iowa City metropolitan areas, as a significant source of local news and information. </p>
                            <p>Historical editions of the Evening Gazette are preserved in various archives, including the Cedar Rapids Public Library, Advantage Archives, and various other sources. These resources provide valuable access to its historical content, making it a vital resource for researchers, genealogists, and history enthusiasts interested in Cedar Rapids' regional history.</p>

                        <section aria-labelledby="archives-heading">
                            <h2 id="archives-heading">Available Archives</h2>
                            <ul class="date-list" role="list">
                                ${dateDirs.map(dir => {
                                    const formattedDate = new Date(dir.date).toLocaleDateString('en-US', { 
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    });
                                    return `
                                    <li>
                                        <div class="date-header" role="heading" aria-level="3">${formattedDate}</div>
                                        <div class="format-options" role="group" aria-label="Viewing options for ${formattedDate}">
                                            ${dir.hasImages ? `
                                                <a href="/view/${dir.date}" 
                                                   class="format-button"
                                                   role="button"
                                                   aria-label="View images from ${formattedDate}">
                                                    <i class="fas fa-images" aria-hidden="true"></i>
                                                    <span>View Images</span>
                                                </a>
                                            ` : ''}
                                            ${dir.pdfs.length > 0 ? `
                                                <a href="/view-pdfs/${dir.date}" 
                                                   class="format-button pdf"
                                                   role="button"
                                                   aria-label="View PDF version from ${formattedDate} with ${dir.pdfs.length} pages">
                                                    <i class="fas fa-file-pdf" aria-hidden="true"></i>
                                                    <span>View PDFs (${dir.pdfs.length} pages)</span>
                                                </a>
                                            ` : ''}
                                        </div>
                                    </li>
                                `}).join('')}
                            </ul>

                            <div class="support-section">
                                <p id="contribute-text">View project source code and contribute:</p>
                                <a href="https://github.com/whatcheers/crCentury-Scraper" 
                                   class="github-button"
                                   role="button"
                                   aria-labelledby="contribute-text">
                                    <i class="fab fa-github" aria-hidden="true"></i>
                                    <span>GitHub Repository</span>
                                </a>
                            </div>
                        </section>
                    </div>
                </main>

                <footer role="contentinfo">
                    <div class="container">
                        <h2>Why?</h2>
                        <p class="footer-note">This page was created primarily for fun, filling the gap left by the lack of good, free, high-quality image hosting services for newspaper scans. It serves the r/cedarrapids community. Until it gets too expensive.</p>
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

// Helper function to generate BookReader HTML
function generateViewerHtml(title, description, files, date) {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <meta name="description" content="${description}">
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <meta name="apple-mobile-web-app-capable" content="yes">

            <!-- JS dependencies -->
            <script src="/bookreader/webcomponents-bundle.js"></script>
            <script src="/bookreader/jquery-3.js"></script>

            <!-- BookReader -->
            <link rel="stylesheet" href="/bookreader/BookReader.css"/>
            <script src="/bookreader/BookReader.js"></script>

            <style>
                html, body { 
                    width: 100%; 
                    height: 100%; 
                    margin: 0; 
                    padding: 0; 
                    background: #939598; 
                }
                .BookReader { 
                    width: 100vw; 
                    height: 100vh; 
                    position: fixed;
                    top: 0;
                    left: 0;
                }
                #BookReader {
                    width: 100%;
                    height: 100%;
                }
                .BRtoolbar {
                    background-color: #333 !important;
                    color: white !important;
                }
                .BRtoolbar a {
                    color: white !important;
                }
            </style>
        </head>
        <body>
            <div id="BookReader"></div>
            <script>
                var options = {
                    data: ${JSON.stringify(files)},
                    bookTitle: '${title}',
                    
                    // UI configuration
                    ui: "full",
                    defaults: 'mode/1up',
                    mode: 1,
                    
                    // Mobile configuration
                    enableMobileNav: true,
                    enableTouchNavigation: true,
                    
                    // Navigation features
                    showToolbar: true,
                    showNavigation: true,
                    showThumbnails: true,
                    
                    // Disable info and share buttons
                    showInfo: false,
                    showShare: false,
                    
                    // Return to home
                    imagesBaseURL: '/bookreader/images/',
                    onHomeClick: function() { window.location.href = '/' }
                };

                var br = new BookReader(options);
                br.init();
            </script>
        </body>
        </html>
    `;
}

// View specific date
app.get('/view/:date', async (req, res) => {
    try {
        const date = req.params.date;
        const imagesDir = path.join(BASE_PATH, date, 'images');
        const files = await fs.readdir(imagesDir);
        const images = files.filter(f => f.endsWith('.png')).sort();
        const formattedDate = new Date(date).toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // BookReader expects an array of arrays, where each sub-array represents a spread
        const imageData = [];
        for (let i = 0; i < images.length; i++) {
            imageData.push([{
                width: 2000,
                height: 3000,
                uri: `/${path.join(date, 'images', images[i])}`,
                pageNum: i + 1,
                leafNum: i + 1
            }]);
        }

        const title = `Super Fancy Reddit Specific Image Viewer - ${formattedDate}`;
        const description = `View historical newspaper images from The Evening Gazette - ${formattedDate}`;
        
        res.send(generateViewerHtml(title, description, imageData, date));
    } catch (err) {
        res.status(500).send('Error loading images: ' + err.message);
    }
});

// View PDFs for a specific date
app.get('/view-pdfs/:date', async (req, res) => {
    try {
        const date = req.params.date;
        const dateDir = path.join(BASE_PATH, date);
        const files = await fs.readdir(dateDir);
        const pdfs = files.filter(f => f.endsWith('.pdf')).sort((a, b) => {
            const pageA = parseInt(a.match(/page_(\d+)/)[1]);
            const pageB = parseInt(b.match(/page_(\d+)/)[1]);
            return pageA - pageB;
        });

        const formattedDate = new Date(date).toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>The Evening Gazette - ${formattedDate}</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        font-family: Arial, sans-serif;
                        background: #f0f0f0;
                    }
                    .header {
                        background: #333;
                        color: white;
                        padding: 1rem;
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        z-index: 1000;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .header h1 {
                        margin: 0;
                        font-size: 1.2rem;
                    }
                    .header a {
                        color: white;
                        text-decoration: none;
                    }
                    .header a:hover {
                        text-decoration: underline;
                    }
                    .content {
                        margin-top: 4rem;
                        padding: 1rem;
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                    }
                    .pdf-container {
                        background: white;
                        padding: 1rem;
                        border-radius: 4px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    .pdf-frame {
                        width: 100%;
                        height: 800px;
                        border: none;
                    }
                    @media (min-width: 1200px) {
                        .content {
                            padding: 2rem 10%;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>The Evening Gazette - ${formattedDate}</h1>
                    <a href="/">← Back to Archive</a>
                </div>
                <div class="content">
                    ${pdfs.map((pdf, index) => `
                        <div class="pdf-container">
                            <h2>Page ${index + 1}</h2>
                            <iframe 
                                class="pdf-frame"
                                src="/${date}/${pdf}#toolbar=1&navpanes=1"
                                type="application/pdf"
                                title="Page ${index + 1}"
                            ></iframe>
                        </div>
                    `).join('')}
                </div>
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
    console.log(`Using base path: ${BASE_PATH}`);
}); 
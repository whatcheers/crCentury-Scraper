const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const rateLimit = require('express-rate-limit');
const serveStatic = require('serve-static');
const galleryRouter = require('./routes/gallery');

const app = express();
const port = process.env.PORT || 3200;

// Set up base paths
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const PHOTOS_DIR = path.join(PUBLIC_DIR, 'photos');
const BASE_PATH = process.env.BASE_PATH || ROOT_DIR;

console.log('Starting server with:');
console.log('- Port:', port);
console.log('- Root directory:', ROOT_DIR);
console.log('- Public directory:', PUBLIC_DIR);
console.log('- Photos directory:', PHOTOS_DIR);
console.log('- Base path:', BASE_PATH);

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).send('Something broke! Error: ' + err.message);
});

// Test route to verify server is responding
app.get('/test', (req, res) => {
    res.send('Server is running!');
});

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // limit each IP to 2000 requests per windowMs
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
app.use('/', express.static(PUBLIC_DIR, {
    setHeaders: (res, path) => {
        // Set correct MIME types
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
        } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (path.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (path.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/gif');
        }
    }
}));

// Serve photos directly with proper MIME types
app.use('/photos', express.static(PHOTOS_DIR, {
    setHeaders: (res, path) => {
        if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (path.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        } else if (path.endsWith('.gif')) {
            res.setHeader('Content-Type', 'image/gif');
        }
        res.setHeader('Cache-Control', 'public, max-age=2592000');
    }
}));

// Add gallery route
app.use('/gallery', galleryRouter);

// Main page - shows list of available dates
app.get('/', (req, res) => {
    console.log('Serving main page');
    res.setHeader('Content-Type', 'text/html');
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>Cedar Rapids Evening Gazette Archive</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <h1>Cedar Rapids Evening Gazette Archive</h1>
            <p>Welcome to the archive viewer.</p>
            <a href="/gallery">View Gallery</a>
            <hr>
            <div id="debug">
                <p>Debug Info:</p>
                <p>Server Time: ${new Date().toISOString()}</p>
                <p>Public Dir: ${PUBLIC_DIR}</p>
            </div>
        </body>
        </html>
    `);
});

// Direct date URL handling
app.get('/:date', async (req, res, next) => {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (datePattern.test(req.params.date)) {
        res.redirect(`/view/${req.params.date}`);
    } else {
        next();
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

// Export the app for testing
module.exports = app;

// Start server if this is the main module
if (require.main === module) {
    const server = app.listen(port, '0.0.0.0', (err) => {
        if (err) {
            console.error('Failed to start server:', err);
            process.exit(1);
        }
        console.log(`Server is running at http://0.0.0.0:${port}`);
        console.log('Press Ctrl+C to stop');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use. Please try a different port or kill the process using this port.`);
        } else {
            console.error('Server error:', err);
        }
        process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
        console.log('SIGTERM signal received: closing HTTP server');
        server.close(() => {
            console.log('HTTP server closed');
        });
    });
} 
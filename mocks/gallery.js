const express = require('express');
const router = express.Router();

// Mock gallery data
const mockImages = [
    {
        src: '/photos/test1.jpg',
        width: 800,
        height: 600,
        aspectRatio: 1.33,
        title: 'Test Image 1'
    },
    {
        src: '/photos/test2.jpg',
        width: 800,
        height: 600,
        aspectRatio: 1.33,
        title: 'Test Image 2'
    }
];

// Gallery route
router.get('/', (req, res) => {
    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>Historical Cedar Rapids Photos</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="/css/gallery.css">
        </head>
        <body>
            <header>
                <h1>Historical Cedar Rapids Photos</h1>
                <a href="/" class="back-link">← Back to Newspapers</a>
            </header>

            <div class="gallery-container">
                <div class="gallery-grid" id="gallery">
                    ${mockImages.map((img, index) => `
                        <div class="gallery-item">
                            <figure>
                                <div class="loading-placeholder" style="aspect-ratio: 4/3;"></div>
                                <img 
                                    data-src="${img.src}"
                                    alt="${img.title}"
                                    class="lazy"
                                    width="${img.width}"
                                    height="${img.height}"
                                />
                                <figcaption>
                                    ${img.title}
                                    <button class="share-button" aria-label="Share ${img.title}">
                                        <i class="fas fa-share-alt" aria-hidden="true"></i>
                                    </button>
                                </figcaption>
                            </figure>
                        </div>
                    `).join('')}
                </div>
                <div class="pull-indicator"></div>
            </div>
        </body>
        </html>
    `;
    
    // Handle JSON requests for infinite scroll
    if (req.query.format === 'json') {
        res.json({
            images: mockImages,
            currentPage: 1,
            totalPages: 1
        });
        return;
    }
    
    res.send(html);
});

module.exports = router; 
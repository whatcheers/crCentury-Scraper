const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Helper function to get image dimensions
async function getImageMetadata(imagePath) {
    try {
        const sizeOf = require('image-size');
        const dimensions = await new Promise((resolve, reject) => {
            sizeOf(imagePath, (error, dimensions) => {
                if (error) reject(error);
                else resolve(dimensions);
            });
        });
        return dimensions;
    } catch (error) {
        console.error(`Error getting dimensions for ${imagePath}:`, error);
        // Return default dimensions if we can't get the actual ones
        return { width: 800, height: 600 };
    }
}

// Gallery route
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const perPage = 20; // Reduced number of images per page
        const photosDir = path.join(process.cwd(), 'public', 'photos');
        
        // Get all image files
        const files = (await fs.readdir(photosDir))
            .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
            .filter(file => !file.startsWith('test')); // Exclude test images
        
        // Calculate pagination
        const totalImages = files.length;
        const totalPages = Math.ceil(totalImages / perPage);
        const startIndex = (page - 1) * perPage;
        const endIndex = Math.min(startIndex + perPage, totalImages);
        
        // Get current page's images with metadata
        const currentFiles = files.slice(startIndex, endIndex);
        const images = await Promise.all(
            currentFiles.map(async file => {
                const filePath = path.join(photosDir, file);
                try {
                    const dimensions = await getImageMetadata(filePath);
                    return {
                        src: `/photos/${file}`,
                        width: dimensions.width || 800,
                        height: dimensions.height || 600,
                        aspectRatio: (dimensions.width || 800) / (dimensions.height || 600),
                        title: file.replace(/\.[^/.]+$/, "").replace(/_/g, " ")
                    };
                } catch (error) {
                    console.error(`Error processing ${file}:`, error);
                    // Return a default object if processing fails
                    return {
                        src: `/photos/${file}`,
                        width: 800,
                        height: 600,
                        aspectRatio: 1.33,
                        title: file.replace(/\.[^/.]+$/, "").replace(/_/g, " ")
                    };
                }
            })
        );

        // Filter out any null entries from failed processing
        const validImages = images.filter(img => img !== null);

        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <title>Historical Cedar Rapids Photo Gallery</title>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="/css/gallery.css">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/photoswipe/5.3.8/photoswipe.min.css">
                <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
                <script src="https://cdnjs.cloudflare.com/ajax/libs/photoswipe/5.3.8/umd/photoswipe.umd.min.js"></script>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/photoswipe/5.3.8/umd/photoswipe-lightbox.umd.min.js"></script>
                <script>
                    // Make PhotoSwipe available globally
                    window.PhotoSwipe = PhotoSwipe;
                </script>
            </head>
            <body>
                <header>
                    <h1>Historical Cedar Rapids Photos</h1>
                    <a href="/" class="back-link">← Back to Newspapers</a>
                </header>

                <div class="gallery-container">
                    <div class="gallery-grid" id="gallery">
                        ${validImages.map((img, index) => `
                            <div class="gallery-item" style="animation-delay: ${index * 0.1}s">
                                <a 
                                    href="${img.src}" 
                                    data-pswp-width="${img.width}"
                                    data-pswp-height="${img.height}"
                                    target="_blank"
                                    id="img-${index}"
                                >
                                    <figure>
                                        <div class="loading-placeholder" style="aspect-ratio: 4/3;"></div>
                                        <img 
                                            data-src="${img.src}"
                                            alt="${img.title}"
                                            class="lazy"
                                        />
                                        <figcaption>
                                            ${img.title}
                                            <button class="share-button" onclick="showShareDialog(event, '${img.src}', '${img.title}', ${index})">
                                                <i class="fas fa-share-alt"></i>
                                            </button>
                                        </figcaption>
                                    </figure>
                                </a>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Share Dialog -->
                    <div id="share-dialog" class="share-dialog">
                        <div class="share-content">
                            <button class="close-button" onclick="hideShareDialog()">
                                <i class="fas fa-times"></i>
                            </button>
                            <h3>Share Image</h3>
                            <div class="share-options">
                                <div class="share-option">
                                    <input type="text" id="share-url" readonly>
                                    <button onclick="copyToClipboard()" class="copy-button">
                                        <i class="fas fa-copy"></i> Copy
                                    </button>
                                </div>
                                <div class="social-share">
                                    <button onclick="shareOnFacebook()" class="facebook">
                                        <i class="fab fa-facebook"></i> Facebook
                                    </button>
                                    <button onclick="shareOnTwitter()" class="twitter">
                                        <i class="fab fa-twitter"></i> Twitter
                                    </button>
                                    <button onclick="shareOnPinterest()" class="pinterest">
                                        <i class="fab fa-pinterest"></i> Pinterest
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${page < totalPages ? `
                        <div class="loading-indicator" id="loading-indicator">
                            <div class="loading-spinner"></div>
                            <span>Loading more images...</span>
                        </div>
                    ` : ''}

                    <script>
                        // Initialize PhotoSwipe
                        let lightbox = new PhotoSwipeLightbox({
                            gallery: '#gallery',
                            children: 'a',
                            pswpModule: PhotoSwipe,
                            padding: { top: 30, bottom: 30, left: 30, right: 30 },
                            bgOpacity: 0.85,
                            showHideAnimationType: 'zoom',
                            allowPanToNext: true,
                            allowMouseDrag: true,
                            wheelToZoom: true,
                            arrowKeys: true,
                            closeOnVerticalDrag: true,
                            showHideOpacity: true,
                            pinchToClose: true,
                            doubleTapToZoom: true,
                            zoomAnimationDuration: 300,
                            easing: 'cubic-bezier(0.4, 0, 0.22, 1)'
                        });
                        lightbox.init();

                        // Lazy loading implementation
                        function lazyLoad() {
                            const lazyImages = document.querySelectorAll('img.lazy');
                            const imageObserver = new IntersectionObserver((entries, observer) => {
                                entries.forEach(entry => {
                                    if (entry.isIntersecting) {
                                        const img = entry.target;
                                        img.src = img.dataset.src;
                                        img.classList.remove('lazy');
                                        img.classList.add('loading');
                                        
                                        img.onload = function() {
                                            img.classList.remove('loading');
                                            img.classList.add('loaded');
                                            const placeholder = img.previousElementSibling;
                                            if (placeholder && placeholder.classList.contains('loading-placeholder')) {
                                                placeholder.remove();
                                            }
                                        };
                                        
                                        observer.unobserve(img);
                                    }
                                });
                            }, {
                                rootMargin: '50px 0px',
                                threshold: 0.01
                            });

                            lazyImages.forEach(img => imageObserver.observe(img));
                        }

                        // Infinite scroll implementation
                        let currentPage = ${page};
                        let loading = false;
                        const totalPages = ${totalPages};
                        const gallery = document.getElementById('gallery');
                        const loadingIndicator = document.getElementById('loading-indicator');

                        // Create intersection observer for infinite scroll
                        if (loadingIndicator) {
                            const scrollObserver = new IntersectionObserver((entries) => {
                                entries.forEach(entry => {
                                    if (entry.isIntersecting && !loading && currentPage < totalPages) {
                                        loadNextPage();
                                    }
                                });
                            }, {
                                rootMargin: '100px'
                            });

                            scrollObserver.observe(loadingIndicator);
                        }

                        async function loadNextPage() {
                            if (loading || currentPage >= totalPages) return;
                            
                            loading = true;
                            currentPage++;

                            try {
                                const response = await fetch(\`/gallery?page=\${currentPage}&format=json\`);
                                const data = await response.json();
                                
                                data.images.forEach((img, index) => {
                                    const delay = index * 0.1;
                                    const itemDiv = document.createElement('div');
                                    itemDiv.className = 'gallery-item';
                                    itemDiv.style.animationDelay = \`\${delay}s\`;
                                    
                                    itemDiv.innerHTML = \`
                                        <a href="\${img.src}" 
                                           data-pswp-width="\${img.width}"
                                           data-pswp-height="\${img.height}"
                                           target="_blank"
                                           id="img-\${(currentPage - 1) * 20 + index}">
                                            <figure>
                                                <div class="loading-placeholder" style="aspect-ratio: 4/3;"></div>
                                                <img 
                                                    data-src="\${img.src}"
                                                    alt="\${img.title}"
                                                    class="lazy"
                                                />
                                                <figcaption>
                                                    \${img.title}
                                                    <button class="share-button" onclick="showShareDialog(event, '\${img.src}', '\${img.title}', \${(currentPage - 1) * 20 + index})">
                                                        <i class="fas fa-share-alt"></i>
                                                    </button>
                                                </figcaption>
                                            </figure>
                                        </a>
                                    \`;
                                    
                                    gallery.appendChild(itemDiv);
                                });

                                // Initialize lazy loading for new images
                                lazyLoad();

                                // Update PhotoSwipe
                                lightbox.destroy();
                                lightbox = new PhotoSwipeLightbox({
                                    gallery: '#gallery',
                                    children: 'a',
                                    pswpModule: PhotoSwipe,
                                    padding: { top: 30, bottom: 30, left: 30, right: 30 },
                                    bgOpacity: 0.85,
                                    showHideAnimationType: 'zoom',
                                    allowPanToNext: true,
                                    allowMouseDrag: true,
                                    wheelToZoom: true,
                                    arrowKeys: true,
                                    closeOnVerticalDrag: true,
                                    showHideOpacity: true,
                                    pinchToClose: true,
                                    doubleTapToZoom: true,
                                    zoomAnimationDuration: 300,
                                    easing: 'cubic-bezier(0.4, 0, 0.22, 1)'
                                });
                                lightbox.init();

                                if (currentPage >= totalPages && loadingIndicator) {
                                    loadingIndicator.remove();
                                }
                            } catch (error) {
                                console.error('Error loading more images:', error);
                            } finally {
                                loading = false;
                            }
                        }

                        // Initialize lazy loading on page load
                        document.addEventListener('DOMContentLoaded', function() {
                            lazyLoad();
                            const grid = document.querySelector('.gallery-grid');
                            grid.classList.add('loaded');
                        });

                        // Share functionality
                        const shareDialog = document.getElementById('share-dialog');
                        const shareUrl = document.getElementById('share-url');

                        function showShareDialog(event, imageSrc, title, index) {
                            event.preventDefault();
                            event.stopPropagation();
                            
                            const fullUrl = \`\${window.location.origin}/gallery?image=\${index}#img-\${index}\`;
                            shareUrl.value = fullUrl;
                            
                            shareDialog.setAttribute('data-image', imageSrc);
                            shareDialog.setAttribute('data-title', title);
                            shareDialog.classList.add('active');
                        }

                        function hideShareDialog() {
                            shareDialog.classList.remove('active');
                        }

                        function copyToClipboard() {
                            shareUrl.select();
                            document.execCommand('copy');
                            
                            const copyButton = document.querySelector('.copy-button');
                            copyButton.innerHTML = '<i class="fas fa-check"></i> Copied!';
                            setTimeout(() => {
                                copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
                            }, 2000);
                        }

                        function shareOnFacebook() {
                            const url = shareDialog.getAttribute('data-image');
                            const title = shareDialog.getAttribute('data-title');
                            window.open(\`https://www.facebook.com/sharer/sharer.php?u=\${encodeURIComponent(shareUrl.value)}&quote=\${encodeURIComponent(title)}\`, '_blank');
                        }

                        function shareOnTwitter() {
                            const title = shareDialog.getAttribute('data-title');
                            window.open(\`https://twitter.com/intent/tweet?url=\${encodeURIComponent(shareUrl.value)}&text=\${encodeURIComponent(title)}\`, '_blank');
                        }

                        function shareOnPinterest() {
                            const url = shareDialog.getAttribute('data-image');
                            const title = shareDialog.getAttribute('data-title');
                            window.open(\`https://pinterest.com/pin/create/button/?url=\${encodeURIComponent(shareUrl.value)}&media=\${encodeURIComponent(url)}&description=\${encodeURIComponent(title)}\`, '_blank');
                        }

                        // Close share dialog when clicking outside
                        document.addEventListener('click', (event) => {
                            if (event.target === shareDialog) {
                                hideShareDialog();
                            }
                        });

                        // Handle direct links to images
                        window.addEventListener('load', () => {
                            const urlParams = new URLSearchParams(window.location.search);
                            const imageIndex = urlParams.get('image');
                            if (imageIndex && window.location.hash) {
                                const imageElement = document.querySelector(window.location.hash);
                                if (imageElement) {
                                    imageElement.scrollIntoView({ behavior: 'smooth' });
                                    setTimeout(() => {
                                        imageElement.click();
                                    }, 500);
                                }
                            }
                        });
                    </script>
                </div>
            </body>
            </html>
        `;
        
        // Handle JSON requests for infinite scroll
        if (req.query.format === 'json') {
            res.json({
                images: validImages,
                currentPage: page,
                totalPages: totalPages
            });
            return;
        }
        
        res.send(html);
    } catch (error) {
        console.error('Gallery error:', error);
        res.status(500).send('Error loading gallery: ' + error.message);
    }
});

module.exports = router; 
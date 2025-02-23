// Mobile-specific enhancements
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        setupPullToRefresh();
        setupDoubleTapZoom();
        setupLazyLoading();
        setupTouchFeedback();
    } else {
        // Still setup lazy loading for desktop
        setupLazyLoading();
    }
});

function setupPullToRefresh() {
    let startY = 0;
    let pullIndicator = document.querySelector('.pull-indicator');
    
    if (!pullIndicator) {
        pullIndicator = document.createElement('div');
        pullIndicator.className = 'pull-indicator';
        document.body.appendChild(pullIndicator);
    }
    
    // Touch events
    document.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        startY = touch.clientY;
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const currentY = touch.clientY;
        const diff = currentY - startY;
        
        if (window.scrollY === 0 && diff > 0) {
            pullIndicator.style.transform = `scaleX(${Math.min(diff / 100, 1)})`;
            e.preventDefault();
        }
    }, { passive: false });
    
    document.addEventListener('touchend', () => {
        if (window.scrollY === 0 && pullIndicator.style.transform !== 'scaleX(0)') {
            pullIndicator.style.transform = 'scaleX(0)';
            window.location.reload();
        }
    });

    // Mouse events (for testing)
    document.addEventListener('mousedown', (e) => {
        startY = e.clientY;
    });
    
    document.addEventListener('mousemove', (e) => {
        if (e.buttons === 1) { // Left mouse button is pressed
            const diff = e.clientY - startY;
            
            if (window.scrollY === 0 && diff > 0) {
                pullIndicator.style.transform = `scaleX(${Math.min(diff / 100, 1)})`;
            }
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (window.scrollY === 0 && pullIndicator.style.transform !== 'scaleX(0)') {
            pullIndicator.style.transform = 'scaleX(0)';
            window.location.reload();
        }
    });
}

function setupDoubleTapZoom() {
    const images = document.querySelectorAll('.grid-item img');
    let lastTap = 0;
    
    images.forEach(img => {
        img.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 500 && tapLength > 0) {
                e.preventDefault();
                img.style.transform = img.style.transform === 'scale(2)' ? 'scale(1)' : 'scale(2)';
            }
            
            lastTap = currentTime;
        });
    });
}

function setupLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        });
        
        document.querySelectorAll('img.lazy-load').forEach(img => {
            // Set a placeholder src if not already set
            if (!img.src) {
                img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
            }
            imageObserver.observe(img);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        document.querySelectorAll('img.lazy-load').forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
                img.classList.add('loaded');
            }
        });
    }
}

function setupTouchFeedback() {
    const touchElements = document.querySelectorAll('a, button, .grid-item');
    
    touchElements.forEach(element => {
        element.addEventListener('touchstart', () => {
            element.style.opacity = '0.7';
        }, { passive: true });
        
        element.addEventListener('touchend', () => {
            element.style.opacity = '1';
        });
        
        element.addEventListener('touchcancel', () => {
            element.style.opacity = '1';
        });
    });
}

// Smooth scrolling for pagination
document.querySelectorAll('.pagination a').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        window.history.pushState({}, '', href);
        
        // Smooth scroll to top before loading new page
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });

        // Load new page after scroll
        setTimeout(() => {
            window.location.reload();
        }, 500);
    });
}); 
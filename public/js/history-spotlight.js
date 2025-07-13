// History Spotlight Interactive Features

document.addEventListener('DOMContentLoaded', function() {
    
    // Create reading progress indicator
    const progressBar = document.createElement('div');
    progressBar.className = 'reading-progress';
    document.body.appendChild(progressBar);
    
    // Update reading progress on scroll
    function updateReadingProgress() {
        const article = document.querySelector('.article-content');
        if (!article) return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / scrollHeight) * 100;
        
        progressBar.style.width = Math.min(progress, 100) + '%';
    }
    
    // Throttled scroll handler for better performance
    let scrollTimeout;
    function throttledScrollHandler() {
        if (scrollTimeout) {
            cancelAnimationFrame(scrollTimeout);
        }
        scrollTimeout = requestAnimationFrame(updateReadingProgress);
    }
    
    window.addEventListener('scroll', throttledScrollHandler);
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Enhanced citation tooltips
    const citations = document.querySelectorAll('.citation');
    citations.forEach(citation => {
        citation.addEventListener('mouseenter', function() {
            // Future enhancement: show citation details in tooltip
            this.style.transform = 'scale(1.1)';
        });
        
        citation.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
    
    // Reading time estimator
    function estimateReadingTime() {
        const text = document.querySelector('.story-wrapper').textContent;
        const wordsPerMinute = 200;
        const words = text.trim().split(/\s+/).length;
        const minutes = Math.ceil(words / wordsPerMinute);
        return minutes;
    }
    
    // Mobile-specific optimizations
    function isMobile() {
        return window.innerWidth <= 768;
    }
    
    // Add reading time to the header
    const readingTime = estimateReadingTime();
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb && readingTime > 0) {
        const timeIndicator = document.createElement('span');
        timeIndicator.className = 'reading-time';
        timeIndicator.innerHTML = `<i class="fas fa-clock"></i> ${readingTime} min read`;
        timeIndicator.style.marginLeft = '1rem';
        timeIndicator.style.opacity = '0.7';
        timeIndicator.style.fontSize = '0.8rem';
        breadcrumb.appendChild(timeIndicator);
    }
    
    // Enhanced keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Press 'T' to toggle theme
        if (e.key === 't' || e.key === 'T') {
            const themeToggle = document.getElementById('theme-toggle');
            if (themeToggle) {
                themeToggle.click();
            }
        }
        
        // Press 'H' to go to home
        if (e.key === 'h' || e.key === 'H') {
            window.location.href = '/';
        }
        
        // Press 'P' to print
        if (e.key === 'p' || e.key === 'P') {
            window.print();
        }
    });
    
    // Lazy loading for images (if any are added in the future)
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
    
    // Save reading position to localStorage
    function saveReadingPosition() {
        const scrollPosition = window.pageYOffset;
        localStorage.setItem('bever-reading-position', scrollPosition);
    }
    
    // Restore reading position
    function restoreReadingPosition() {
        const savedPosition = localStorage.getItem('bever-reading-position');
        if (savedPosition) {
            window.scrollTo(0, parseInt(savedPosition));
        }
    }
    
    // Save position when leaving page
    window.addEventListener('beforeunload', saveReadingPosition);
    
    // Restore position after a short delay to allow content to load
    setTimeout(restoreReadingPosition, 100);
    
    // Share functionality (if Web Share API is available)
    if (navigator.share) {
        const shareButton = document.createElement('button');
        shareButton.innerHTML = '<i class="fas fa-share-alt"></i> Share';
        shareButton.className = 'share-button';
        shareButton.style.cssText = `
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: var(--accent-color);
            color: white;
            border: none;
            border-radius: 50px;
            padding: 0.8rem 1.2rem;
            font-size: 0.9rem;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            transition: transform 0.2s;
        `;
        
        shareButton.addEventListener('click', async () => {
            try {
                await navigator.share({
                    title: 'The Bever Bone Battle - Cedar Rapids History',
                    text: 'A fascinating story about a contested will that gripped Cedar Rapids in the 1890s',
                    url: window.location.href
                });
            } catch (err) {
                console.log('Share failed:', err);
            }
        });
        
        shareButton.addEventListener('mouseenter', () => {
            shareButton.style.transform = 'scale(1.1)';
        });
        
        shareButton.addEventListener('mouseleave', () => {
            shareButton.style.transform = 'scale(1)';
        });
        
        document.body.appendChild(shareButton);
    }
    
    // Initialize reading progress
    updateReadingProgress();
}); 
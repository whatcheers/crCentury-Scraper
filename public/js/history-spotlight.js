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
        const textElement = document.querySelector('.article-content');
        if (!textElement) return 0;
        const text = textElement.textContent;
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

// Unified Audio Player
document.addEventListener('DOMContentLoaded', function() {
    const audio = document.getElementById('story-audio');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const timeDisplay = document.getElementById('time-display');
    const audioStatus = document.querySelector('.audio-status');
    const speedButtons = document.querySelectorAll('.speed-btn');
    
    console.log('Audio elements found:', {
        audio: !!audio,
        playPauseBtn: !!playPauseBtn,
        progressBar: !!progressBar,
        audioStatus: !!audioStatus
    });
    
    if (!audio || !playPauseBtn) {
        console.error('Required audio elements not found!');
        return;
    }
    
    let isPlaying = false;
    let duration = 0;
    
    // Format time in MM:SS format
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Update progress bar and time display
    function updateProgress() {
        if (duration > 0) {
            const progress = (audio.currentTime / duration) * 100;
            progressFill.style.width = progress + '%';
            timeDisplay.textContent = `${formatTime(audio.currentTime)} / ${formatTime(duration)}`;
        }
    }
    
    // Toggle play/pause
    playPauseBtn.addEventListener('click', function() {
        console.log('Play button clicked! isPlaying:', isPlaying);
        if (isPlaying) {
            audio.pause();
        } else {
            console.log('Attempting to play audio...');
            audio.play().then(() => {
                console.log('Audio started successfully');
            }).catch(function(error) {
                console.error('Audio play failed:', error);
                audioStatus.textContent = 'Playback failed - ' + error.message;
            });
        }
    });
    
    // Audio event listeners
    audio.addEventListener('loadedmetadata', function() {
        duration = audio.duration;
        console.log('Audio duration:', duration);
        timeDisplay.textContent = `0:00 / ${formatTime(duration)}`;
    });
    
    audio.addEventListener('play', function() {
        console.log('Audio play event fired');
        isPlaying = true;
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        audioStatus.textContent = 'Now playing...';
        playPauseBtn.setAttribute('aria-label', 'Pause audio');
    });
    
    audio.addEventListener('pause', function() {
        console.log('Audio pause event fired');
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        audioStatus.textContent = 'Listen to this story';
        playPauseBtn.setAttribute('aria-label', 'Play audio');
    });
    
    audio.addEventListener('ended', function() {
        console.log('Audio ended event fired');
        isPlaying = false;
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        audioStatus.textContent = 'Listen to this story';
        progressFill.style.width = '0%';
        timeDisplay.textContent = `0:00 / ${formatTime(duration)}`;
        playPauseBtn.setAttribute('aria-label', 'Play audio');
    });
    
    audio.addEventListener('timeupdate', updateProgress);
    
    // Click to seek on progress bar
    progressBar.addEventListener('click', function(e) {
        if (duration > 0) {
            const rect = progressBar.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const seekTime = (clickX / rect.width) * duration;
            audio.currentTime = seekTime;
        }
    });
    
    // Error handling
    audio.addEventListener('error', function(e) {
        console.error('Audio error:', e, audio.error);
        playPauseBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        audioStatus.textContent = 'Audio unavailable';
        playPauseBtn.disabled = true;
    });
    
    // Loading state
    audio.addEventListener('loadstart', function() {
        console.log('Audio loading started');
        playPauseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        audioStatus.textContent = 'Loading...';
    });
    
    audio.addEventListener('canplay', function() {
        console.log('Audio can play');
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        audioStatus.textContent = 'Listen to this story';
        playPauseBtn.disabled = false;
    });
    
    // Speed controls
    const savedSpeed = localStorage.getItem('audioSpeed') || '1';
    audio.playbackRate = parseFloat(savedSpeed);
    
    // Update active speed button
    speedButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.speed === savedSpeed);
        
        btn.addEventListener('click', function() {
            const speed = parseFloat(this.dataset.speed);
            audio.playbackRate = speed;
            
            // Update active button
            speedButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Save preference
            localStorage.setItem('audioSpeed', speed.toString());
        });
    });
    
    console.log('Audio player initialized successfully');
}); 
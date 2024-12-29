// Theme handling
document.addEventListener('DOMContentLoaded', function() {
    // Initialize theme toggle button
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Initialize theme
    initTheme();
});

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // Update button icon
    const icon = document.querySelector('.theme-toggle i');
    if (icon) {
        icon.className = `fas fa-${newTheme === 'dark' ? 'moon' : 'sun'}`;
    }
    
    // Save preference
    localStorage.setItem('theme', newTheme);
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateIcon(savedTheme);
    } else if (prefersDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateIcon('dark');
    }
}

function updateIcon(theme) {
    const icon = document.querySelector('.theme-toggle i');
    if (icon) {
        icon.className = `fas fa-${theme === 'dark' ? 'moon' : 'sun'}`;
    }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
        const theme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        updateIcon(theme);
    }
}); 
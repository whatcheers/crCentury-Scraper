module.exports = {
  apps: [{
    name: 'gazette-viewer',
    script: 'gazette-viewer.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      BASE_PATH: '/home/whatcheer/crCentury-Scraper'
    },
    env_production: {
      NODE_ENV: 'production',
      BASE_PATH: '/var/www/redditdev.cheesemonger.info'
    }
  }]
}; 
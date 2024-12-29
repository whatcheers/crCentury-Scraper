module.exports = {
  apps: [{
    name: 'gazette-viewer',
    script: 'gazette-viewer.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3200
    }
  }]
}; 
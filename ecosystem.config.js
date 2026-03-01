module.exports = {
  apps: [
    {
      name: 'console-server',
      cwd: '/var/www/ai613/console/server',
      script: 'dist/index.js', // או הנתיב המדויק לקובץ הראשי אחרי build
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};

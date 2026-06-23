const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'devsoporte',
      cwd: path.join(__dirname, '..', 'backend'),
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3300,
      },
      error_file: path.join(__dirname, 'logs', 'devsoporte-error.log'),
      out_file: path.join(__dirname, 'logs', 'devsoporte-out.log'),
      merge_logs: true,
      time: true,
    },
  ],
};

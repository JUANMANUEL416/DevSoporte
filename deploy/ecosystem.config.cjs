const path = require('node:path');

const deployDir = __dirname;
const rootDir = path.join(deployDir, '..');

module.exports = {
  apps: [
    {
      name: 'devsoporte',
      cwd: path.join(rootDir, 'backend'),
      script: 'src/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3300,
      },
      error_file: path.join(deployDir, 'logs', 'devsoporte-error.log'),
      out_file: path.join(deployDir, 'logs', 'devsoporte-out.log'),
      merge_logs: true,
      time: true,
    },
    {
      name: 'ngrok-devsoporte',
      cwd: deployDir,
      script: 'ngrok-serve.mjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 20,
      env_production: {
        NGROK_PORT: 3300,
      },
      error_file: path.join(deployDir, 'logs', 'ngrok-error.log'),
      out_file: path.join(deployDir, 'logs', 'ngrok-out.log'),
      merge_logs: true,
      time: true,
    },
  ],
};

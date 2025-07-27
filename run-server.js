import { spawn } from 'child_process';
import { execSync } from 'child_process';
import fs from 'fs';

// Kill any existing server processes
try {
  execSync('pkill -f "tsx server/index.ts"', { stdio: 'ignore' });
} catch (e) {
  // Ignore if no processes to kill
}

// Wait for cleanup
setTimeout(() => {
  console.log('Starting IndieShots server...');
  
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    env: { ...process.env, NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true
  });

  // Save PID
  fs.writeFileSync('server.pid', server.pid.toString());

  // Log output
  const logStream = fs.createWriteStream('server.log', { flags: 'w' });
  server.stdout.pipe(logStream);
  server.stderr.pipe(logStream);

  server.on('spawn', () => {
    console.log(`Server started with PID: ${server.pid}`);
    console.log('External access: https://workspace.indieshots.replit.app');
    console.log('Server log: server.log');
  });

  server.on('error', (err) => {
    console.error('Failed to start server:', err);
  });

  // Detach from parent process
  server.unref();
  
}, 2000);
/**
 * Optimized build script for deployment
 * Handles timeout issues and provides better error reporting
 */
import { spawn } from 'child_process';
import { existsSync, rmSync, mkdirSync } from 'fs';
import path from 'path';

console.log('🚀 Starting optimized build process...');

// Clean previous build
if (existsSync('dist')) {
  console.log('🧹 Cleaning previous build...');
  rmSync('dist', { recursive: true, force: true });
}

// Create dist directory
mkdirSync('dist', { recursive: true });

// Build frontend with timeout handling
console.log('🏗️ Building frontend...');
const viteBuild = spawn('npx', ['vite', 'build'], {
  stdio: 'inherit',
  timeout: 300000 // 5 minutes timeout
});

viteBuild.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Frontend build failed with code:', code);
    process.exit(1);
  }
  
  console.log('✅ Frontend build completed');
  console.log('🏗️ Building backend...');
  
  // Build backend
  const backendBuild = spawn('npx', ['esbuild', 'server/index.ts', '--platform=node', '--packages=external', '--bundle', '--format=esm', '--outfile=dist/index.js'], {
    stdio: 'inherit',
    timeout: 60000 // 1 minute timeout
  });
  
  backendBuild.on('close', (backendCode) => {
    if (backendCode !== 0) {
      console.error('❌ Backend build failed with code:', backendCode);
      process.exit(1);
    }
    
    console.log('✅ Backend build completed');
    console.log('🎉 Build process completed successfully!');
    console.log('📁 Built files:');
    console.log('  - Frontend: dist/public/');
    console.log('  - Backend: dist/index.js');
  });
  
  backendBuild.on('error', (err) => {
    console.error('❌ Backend build error:', err);
    process.exit(1);
  });
});

viteBuild.on('error', (err) => {
  console.error('❌ Frontend build error:', err);
  process.exit(1);
});
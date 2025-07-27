#!/bin/bash

echo "🚀 Quick Deploy Script for IndieShots"
echo "=================================="

# Set memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf client/dist/
rm -rf .vite/

# Create dist directory
mkdir -p dist

# Build frontend with timeout protection
echo "🏗️ Building frontend (this may take 5-10 minutes)..."
timeout 600 npx vite build --mode production

if [ $? -eq 0 ]; then
    echo "✅ Frontend build completed"
else
    echo "❌ Frontend build failed or timed out"
    exit 1
fi

# Build backend
echo "🏗️ Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js

if [ $? -eq 0 ]; then
    echo "✅ Backend build completed"
    echo "🎉 Build process completed successfully!"
    echo "📁 Built files:"
    ls -la dist/
else
    echo "❌ Backend build failed"
    exit 1
fi

echo "Ready for deployment! 🚀"
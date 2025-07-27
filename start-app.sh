#!/bin/bash

# Kill any existing server processes
pkill -f "tsx server/index.ts" 2>/dev/null || true

# Wait for cleanup
sleep 2

# Export environment variable
export NODE_ENV=development

# Start the server in background
nohup npx tsx server/index.ts > server.log 2>&1 &

# Get the PID
SERVER_PID=$!
echo $SERVER_PID > server.pid

# Wait for server to initialize
sleep 3

# Check if server is running
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "IndieShots server started successfully with PID: $SERVER_PID"
    echo "External access: https://workspace.indieshots.replit.app"
    echo "Local access: http://localhost:5000"
    echo "Server log: server.log"
else
    echo "Failed to start server. Check server.log for errors."
    cat server.log
fi
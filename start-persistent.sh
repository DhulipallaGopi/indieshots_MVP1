#!/bin/bash

# Kill any existing server processes
pkill -f "tsx server/index.ts"

# Wait a moment for processes to terminate
sleep 2

# Start the server in the background with proper logging
NODE_ENV=development nohup tsx server/index.ts > server.log 2>&1 &

# Store the PID
echo $! > server.pid

# Wait a moment for the server to initialize
sleep 3

# Check if the server is running
if ps -p $(cat server.pid) > /dev/null 2>&1; then
    echo "IndieShots server started successfully with PID: $(cat server.pid)"
    echo "Server log available at: server.log"
    echo "External access: https://workspace.indieshots.replit.app"
else
    echo "Failed to start IndieShots server"
    echo "Check server.log for errors"
fi
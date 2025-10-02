#!/bin/sh

# Start the backend server in the background
cd /app/backend
node index.js &

# Wait a moment to ensure backend is starting up
sleep 2

# Start Nginx in the foreground (this keeps the container running)
nginx -g "daemon off;"
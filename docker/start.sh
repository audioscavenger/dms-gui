#!/bin/sh

# JWT secrets for tokens
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export JWT_SECRET_REFRESH=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Start the backend server in the background
cd /app/backend
node index.js &

# this only detects changes in /backend and does not recompile the frontend. useless
# https://www.metered.ca/blog/how-to-restart-your-node-js-apps-automatically-with-nodemon/
# nodemon index.js &

# Wait a moment to ensure backend is starting up
sleep 2

# Start Nginx in the foreground (this keeps the container running)
nginx -g "daemon off;"
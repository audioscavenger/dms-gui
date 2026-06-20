#!/bin/sh

# JWT secrets for tokens, without openssl; otherwise that would be openssl rand -hex 32
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export JWT_SECRET_REFRESH=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# use demo database
[ "$isDEMO" = "true" ] && cp /app/config/dms-gui-example.sqlite3 /app/config/dms-gui-demo.sqlite3
[ "$isDEMO" = "true" ] && touch /app/config/isDemo || rm -f /app/config/isDemo

# resolve variables in internal nginx.conf template with gettext:
# envsubst '$UPSTREAM_NGINX $BACKEND_PROXY_URL' < /etc/nginx/default.conf.template > /etc/nginx/http.d/default.conf
# resolve variables in internal nginx.conf template with busybox:

sed -i "s|{{BACKEND_PROXY_URL}}|${BACKEND_PROXY_URL}|g" /etc/nginx/http.d/default.conf

# Start the backend server in the background
if [ "$ENV_MODE" = "development" ]; then

  # nodemon only detects changes in /backend and does not recompile the frontend. useless
  # https://www.metered.ca/blog/how-to-restart-your-node-js-apps-automatically-with-nodemon/
  echo "DEVELOPMENT: Starting backend:${PORT_BACKEND}..."
  cd /app/backend && nodemon index.js &
  
  echo "DEVELOPMENT: Starting Webpack:${PORT_FRONTEND}..."
  cd /app/frontend && npm run start &
  
  # Wait a moment to ensure apps are starting up
  sleep 2

  sed -i "s|{{UPSTREAM_NGINX}}|${UPSTREAM_NGINX_DEVELOPMENT}|g" /etc/nginx/http.d/default.conf
  [ "$DEBUG" = "true" ] && echo [DEBUG] ls -la /app/frontend && ls -la /app/frontend && echo [DEBUG] cat -n /etc/nginx/http.d/default.conf && cat -n /etc/nginx/http.d/default.conf

  # Start Nginx in the foreground (this keeps the container running)
  # dms-gui has a way to kill nginx and restart the container
  echo "DEVELOPMENT: Starting nginx:80..."
  nginx -g "daemon off;"

else
  # Start Node in the FOREGROUND; /app/frontend/dist will be used
  echo "PRODUCTION: Starting backend:${PORT_BACKEND}..."
  cd /app/backend && node index.js &

  # Start Nginx in the foreground (this keeps the container running)
  # dms-gui has a way to kill nginx and restart the container
  sed -i "s|{{UPSTREAM_NGINX}}|${UPSTREAM_NGINX_PRODUTION}|g" /etc/nginx/http.d/default.conf
  [ "$DEBUG" = "true" ] && echo [DEBUG] ls -la /app/frontend && ls -la /app/frontend && echo [DEBUG] cat -n /etc/nginx/http.d/default.conf && cat -n /etc/nginx/http.d/default.conf

  echo "PRODUCTION: Starting nginx:80..."
  nginx -g "daemon off;"
fi


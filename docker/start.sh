#!/bin/sh

# JWT secrets for tokens, without openssl; otherwise that would be openssl rand -hex 32
export JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export JWT_SECRET_REFRESH=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export REACT_VERSION=$(node -p "require('/app/frontend/package.json').dependencies.react" | cut -c2-)

# use demo database
if [ "$isDEMO" = "true" ]; then
  cp /app/config/dms-gui-demo.sqlite3 /app/config/dms-gui-demo-live.sqlite3
  touch /app/config/isDemo || rm -f /app/config/isDemo
  echo "------------------------------------------------------------------------"
  echo "------------------------------------------------------------------------"
  echo "-                          DEMO IS LIVE                                -"
  echo "------------------------------------------------------------------------"
  echo "------------------------------------------------------------------------"
fi

# resolve variables in internal nginx.conf template with gettext:
# envsubst '$UPSTREAM_NGINX $BACKEND_PROXY_URL' < /etc/nginx/default.conf.template > /etc/nginx/http.d/default.conf
# resolve variables in internal nginx.conf template with busybox:

sed -i "s|{{BACKEND_PROXY_URL}}|${BACKEND_PROXY_URL}|g" /etc/nginx/http.d/default.conf

# Start the backend server in the background
if [ "$ENV_MODE" = "development" ]; then

  # nodemon only detects changes in /backend and does not recompile the frontend. useless
  # https://www.metered.ca/blog/how-to-restart-your-node-js-apps-automatically-with-nodemon/
  echo "$ENV_MODE: Starting backend:${PORT_BACKEND} with nodemon..."
  cd /app/backend && nodemon index.js &
  
  echo "$ENV_MODE: Starting Webpack:${PORT_FRONTEND}..."
  cd /app/frontend && npm run start &
  
  # Wait a moment to ensure apps are starting up
  sleep 2

  sed -i "s|{{UPSTREAM_NGINX}}|${UPSTREAM_NGINX_DEVELOPMENT}|g" /etc/nginx/http.d/default.conf
  [ "$DEBUG" = "true" ] && echo [DEBUG] ls -la /app/frontend && ls -la /app/frontend && echo [DEBUG] cat -n /etc/nginx/http.d/default.conf && cat -n /etc/nginx/http.d/default.conf

else
  # Start Node in the BACKGROUND; /app/frontend/dist will be used
  if [ "$DEBUG" = "true" ]; then
    echo "$ENV_MODE: Starting backend:${PORT_BACKEND}..."
    cd /app/backend && nodemon index.js &
  else
    echo "$ENV_MODE: Starting backend:${PORT_BACKEND} with nodemon..."
    cd /app/backend && node index.js &
  fi

  sed -i "s|{{UPSTREAM_NGINX}}|${UPSTREAM_NGINX_PRODUTION}|g" /etc/nginx/http.d/default.conf
  [ "$DEBUG" = "true" ] && echo [DEBUG] ls -la /app/frontend && ls -la /app/frontend && echo [DEBUG] cat -n /etc/nginx/http.d/default.conf && cat -n /etc/nginx/http.d/default.conf

fi

# Start Nginx in the foreground (this keeps the container running)
# dms-gui has a way to kill nginx and restart the container
echo "$ENV_MODE: Starting nginx:80..."
nginx -V 2>&1 | egrep "version|built"
export NGINX_VERSION=$(nginx -v 2>&1 | cut -d/ -f2)
nginx -g "daemon off;"

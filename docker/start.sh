#!/bin/sh

# Local Agent FIX: persist JWT secrets across restarts (AUDIT #10) - generate once, then reuse
# previously a fresh secret was minted on every container start, invalidating every session
# the file lives on the same mounted config volume as the sqlite database, so it survives restarts
JWT_SECRET_FILE=/app/config/.jwt-secrets
write_jwt_secrets() {
  echo "export JWT_SECRET=$JWT_SECRET" > "$JWT_SECRET_FILE"
  echo "export JWT_SECRET_REFRESH=$JWT_SECRET_REFRESH" >> "$JWT_SECRET_FILE"
}

export JWT_SECRET
export JWT_SECRET_REFRESH
# Local Agent FIX: periodically rotate the secret - if the persisted file is 7+ days old, remove it so a fresh pair is generated
if [ -f "$JWT_SECRET_FILE" ]; then
  MTIME=$(stat -c %Y "$JWT_SECRET_FILE" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  AGE=$((NOW - MTIME))
  if [ "$AGE" -gt $((7 * 24 * 60 * 60)) ]; then
    echo "JWT secret is older than 7 days, rotating (all sessions will be invalidated)"
    rm -f "$JWT_SECRET_FILE"
    # Local Agent FIX: warn that all existing sessions are now invalid (refresh tokens in DB no longer match the new signature)
    echo "WARNING: all existing sessions have been invalidated by JWT secret rotation; users must log in again" >&2
  fi
fi

# Local Agent FIX: if the persisted file is missing or corrupted, generate a fresh pair and persist it
if [ ! -s "$JWT_SECRET_FILE" ]; then
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  JWT_SECRET_REFRESH=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  write_jwt_secrets
else
  . "$JWT_SECRET_FILE"
fi

# export REACT_VERSION=$(node -p "require('/app/backend/package.frontend.json').dependencies.react" | cut -c2-)   # we can't get this file for some reason
export REACT_VERSION=$(cat /app/REACT_VERSION.txt)

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

# real local development mode requires you to start and not build, the frontend, on your local machine
if [ "$ENV_MODE" = "development" -a -n "$PORT_FRONTEND" ]; then

  # nodemon only detects changes in /backend and does not recompile the frontend. useless
  # https://www.metered.ca/blog/how-to-restart-your-node-js-apps-automatically-with-nodemon/
  echo "$ENV_MODE: Starting backend:${PORT_BACKEND} with nodemon..."
  cd /app/backend && nodemon index.js &
  
  echo "$ENV_MODE: Starting Webpack:${PORT_FRONTEND}..."
  cd /app/frontend && npm run start &
  
  # Wait a moment to ensure apps are starting up
  sleep 2

  # UPSTREAM_NGINX_PRODUTION and UPSTREAM_NGINX_DEVELOPMENT must be defined in .dms-gui.env
  sed -i "s|{{UPSTREAM_NGINX}}|${UPSTREAM_NGINX_DEVELOPMENT}|g" /etc/nginx/http.d/default.conf

else
  # half-ass development mode: that means webpack builds the frontend as usual but with --mode development --devtool eval-source-map
  # Start Node in the BACKGROUND; /app/frontend/dist will be used
  if [ "$ENV_MODE" = "development" ]; then
    echo "$ENV_MODE: Starting backend:${PORT_BACKEND} with nodemon..."
    cd /app/backend && nodemon index.js &
  else
    echo "$ENV_MODE: Starting backend:${PORT_BACKEND} ..."
    cd /app/backend && node index.js &
  fi

  # UPSTREAM_NGINX_PRODUTION and UPSTREAM_NGINX_DEVELOPMENT must be defined in .dms-gui.env
  sed -i "s|{{UPSTREAM_NGINX}}|${UPSTREAM_NGINX_PRODUTION}|g" /etc/nginx/http.d/default.conf
fi

if [ "$DEBUG" = "true" ]; then
  echo [DEBUG] ls -la /app/frontend
  ls -la /app/frontend
  echo [DEBUG] cat -n /etc/nginx/http.d/default.conf
  cat -n /etc/nginx/http.d/default.conf
fi

# Start Nginx in the foreground (this keeps the container running)
# dms-gui has a way to kill nginx and restart the container
echo "$ENV_MODE: Starting nginx:80..."
nginx -V 2>&1 | egrep "version|built"
export NGINX_VERSION=$(nginx -v 2>&1 | cut -d/ -f2)
nginx -g "daemon off;"

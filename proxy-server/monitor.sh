#!/bin/bash

# Check if the proxy server is running
if ! pm2 show salvium-proxy > /dev/null 2>&1; then
    echo "Salvium proxy is down, restarting..."
    cd /var/www/salvium-proxy
    pm2 start server.js --name "salvium-proxy"
    pm2 save
fi

# Check Nginx status
if ! systemctl is-active --quiet nginx; then
    echo "Nginx is down, restarting..."
    sudo systemctl restart nginx
fi

#!/bin/bash

# Script to deploy secrets from .dev.vars to Cloudflare Workers

echo "🔐 Deploying secrets to Cloudflare Workers..."

# Read .dev.vars and set each secret
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  if [[ -n "$key" && "$key" != \#* ]]; then
    echo "Setting secret: $key"
    echo "$value" | wrangler secret put "$key"
  fi
done < .dev.vars

echo "✅ All secrets deployed successfully!" 
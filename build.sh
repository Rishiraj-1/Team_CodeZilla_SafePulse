#!/bin/bash
set -e

# Upgrade pip to latest version (handles building better)
pip install --upgrade pip setuptools wheel

# Install requirements without using cache (avoids read-only filesystem issues)
pip install --no-cache-dir -r backend/requirements.txt

# Optional: Collect static files if needed
# cd frontend && npm run build (if you have frontend)

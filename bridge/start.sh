#!/bin/bash
# Add custom models endpoint if not already patched
if ! grep -q "custom_models" /app/app.py; then
    # Add import after 'import api.chat2api'
    sed -i '/^import api\.chat2api$/a import api.custom_models' /app/app.py
    echo "Patched app.py to include custom_models"
fi
exec python app.py

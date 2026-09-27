#!/bin/bash
# Add custom models endpoint if not already patched
if ! grep -q "custom_models" /app/app.py; then
    sed -i '/^import api\.chat2api$/a import api.custom_models' /app/app.py
    echo "Patched app.py to include custom_models"
fi

# Patch ChatService.py to support modern models (GPT-5.x, GPT-6 Astra, o4-mini)
if ! grep -q "gpt-6-astra" /app/chatgpt/ChatService.py; then
    python3 /app/api/patch_models.py
    echo "Patched ChatService.py with modern model support"
fi

exec python app.py

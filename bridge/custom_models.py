"""
Custom /v1/models endpoint for chat2api
Provides OpenAI-compatible model listing for 9Router integration
"""
import time
from fastapi import Request, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app import app
from utils.configs import authorization

security = HTTPBearer(auto_error=False)

# All models supported by chat2api (updated Sep 2026)
CHAT2API_MODELS = [
    # === GPT-6 Astra (Sep 2026) ===
    {"id": "gpt-6-astra", "object": "model", "owned_by": "openai"},
    # === GPT-5.6 family (Jul 2026) ===
    {"id": "gpt-5.6-sol", "object": "model", "owned_by": "openai"},
    {"id": "gpt-5.6-terra", "object": "model", "owned_by": "openai"},
    {"id": "gpt-5.6-luna", "object": "model", "owned_by": "openai"},
    # === GPT-5.5 (May 2026) ===
    {"id": "gpt-5.5", "object": "model", "owned_by": "openai"},
    # === GPT-5.4 family (Mar 2026) ===
    {"id": "gpt-5.4", "object": "model", "owned_by": "openai"},
    {"id": "gpt-5.4-pro", "object": "model", "owned_by": "openai"},
    {"id": "gpt-5.4-mini", "object": "model", "owned_by": "openai"},
    {"id": "gpt-5.4-nano", "object": "model", "owned_by": "openai"},
    # === GPT-5.3 (Mar 2026) ===
    {"id": "gpt-5.3", "object": "model", "owned_by": "openai"},
    # === GPT-5 base (Aug 2025) ===
    {"id": "gpt-5", "object": "model", "owned_by": "openai"},
    {"id": "gpt-5-mini", "object": "model", "owned_by": "openai"},
    {"id": "gpt-5-nano", "object": "model", "owned_by": "openai"},
    # === o4 family (Apr 2025) ===
    {"id": "o4-mini", "object": "model", "owned_by": "openai"},
    {"id": "o4-mini-high", "object": "model", "owned_by": "openai"},
    # === o3 family ===
    {"id": "o3", "object": "model", "owned_by": "openai"},
    {"id": "o3-pro", "object": "model", "owned_by": "openai"},
    {"id": "o3-mini", "object": "model", "owned_by": "openai"},
    {"id": "o3-mini-high", "object": "model", "owned_by": "openai"},
    # === o1 family ===
    {"id": "o1", "object": "model", "owned_by": "openai"},
    {"id": "o1-mini", "object": "model", "owned_by": "openai"},
    {"id": "o1-preview", "object": "model", "owned_by": "openai"},
    {"id": "o1-pro", "object": "model", "owned_by": "openai"},
    # === GPT-4.5 ===
    {"id": "gpt-4.5", "object": "model", "owned_by": "openai"},
    # === GPT-4.1 family (Apr 2025) ===
    {"id": "gpt-4.1", "object": "model", "owned_by": "openai"},
    {"id": "gpt-4.1-mini", "object": "model", "owned_by": "openai"},
    # === GPT-4o family ===
    {"id": "gpt-4o", "object": "model", "owned_by": "openai"},
    {"id": "gpt-4o-mini", "object": "model", "owned_by": "openai"},
    # === Legacy ===
    {"id": "gpt-4", "object": "model", "owned_by": "openai"},
    {"id": "gpt-3.5-turbo", "object": "model", "owned_by": "openai"},
    # === Auto mode ===
    {"id": "auto", "object": "model", "owned_by": "openai"},
]

# Add created timestamp and permission
for m in CHAT2API_MODELS:
    m["created"] = int(time.time())
    m["permission"] = []


@app.get("/v1/models")
async def list_models(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """OpenAI-compatible /v1/models endpoint"""
    # Validate auth
    if authorization:
        token = None
        if credentials:
            token = credentials.credentials
        if not token:
            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]
        if not token or token != authorization:
            return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    return JSONResponse(content={
        "object": "list",
        "data": CHAT2API_MODELS
    })

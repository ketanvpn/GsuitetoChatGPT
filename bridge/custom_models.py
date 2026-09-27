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

# All models supported by chat2api
CHAT2API_MODELS = [
    # GPT-4o family
    {"id": "gpt-4o", "object": "model", "owned_by": "openai", "permission": []},
    {"id": "gpt-4o-mini", "object": "model", "owned_by": "openai", "permission": []},
    {"id": "gpt-4o-canmore", "object": "model", "owned_by": "openai", "permission": []},
    # GPT-4 family
    {"id": "gpt-4", "object": "model", "owned_by": "openai", "permission": []},
    {"id": "gpt-4-turbo", "object": "model", "owned_by": "openai", "permission": []},
    {"id": "gpt-4-mobile", "object": "model", "owned_by": "openai", "permission": []},
    # GPT-4.5
    {"id": "gpt-4.5o", "object": "model", "owned_by": "openai", "permission": []},
    # GPT-3.5 family
    {"id": "gpt-3.5-turbo", "object": "model", "owned_by": "openai", "permission": []},
    # o-series reasoning models
    {"id": "o1", "object": "model", "owned_by": "openai", "permission": []},
    {"id": "o1-mini", "object": "model", "owned_by": "openai", "permission": []},
    {"id": "o1-preview", "object": "model", "owned_by": "openai", "permission": []},
    {"id": "o1-pro", "object": "model", "owned_by": "openai", "permission": []},
    {"id": "o3", "object": "model", "owned_by": "openai", "permission": []},
    {"id": "o3-mini", "object": "model", "owned_by": "openai", "permission": []},
    {"id": "o3-mini-high", "object": "model", "owned_by": "openai", "permission": []},
    # Auto mode
    {"id": "auto", "object": "model", "owned_by": "openai", "permission": []},
]

# Add created timestamp
for m in CHAT2API_MODELS:
    m["created"] = int(time.time())


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

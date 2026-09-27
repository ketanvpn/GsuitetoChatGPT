"""
Custom /v1/models endpoint for chat2api
Provides OpenAI-compatible model listing for 9Router integration
Aligned with 9Router Codex provider models (Sep 2026)
"""
import time
from fastapi import Request, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app import app
from utils.configs import authorization

security = HTTPBearer(auto_error=False)

CHAT2API_MODELS = [
    # GPT-6 family (Sep 2026)
    {"id": "gpt-6-astra", "object": "model", "owned_by": "openai"},
    {"id": "gpt-6-sol", "object": "model", "owned_by": "openai"},
    {"id": "gpt-6-luna", "object": "model", "owned_by": "openai"},
    # GPT-5.6 family (Jul 2026)
    {"id": "gpt-5.6-sol", "object": "model", "owned_by": "openai"},
    {"id": "gpt-5.6-terra", "object": "model", "owned_by": "openai"},
    {"id": "gpt-5.6-luna", "object": "model", "owned_by": "openai"},
    # GPT-5.5 / 5.4 / 5.3
    {"id": "gpt-5.5", "object": "model", "owned_by": "openai"},
    {"id": "gpt-5.4", "object": "model", "owned_by": "openai"},
    {"id": "gpt-5.4-mini", "object": "model", "owned_by": "openai"},
    {"id": "gpt-5.3-codex-spark", "object": "model", "owned_by": "openai"},
    # Auto
    {"id": "auto", "object": "model", "owned_by": "openai"},
]

for m in CHAT2API_MODELS:
    m["created"] = int(time.time())
    m["permission"] = []


@app.get("/v1/models")
async def list_models(request: Request, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """OpenAI-compatible /v1/models endpoint"""
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

"""Auth: validate Azure AD Bearer token for API access. Run token validated in ingestion."""

from __future__ import annotations

import json
import os
from typing import Any

import httpx
import jwt
from fastapi import HTTPException, Request, status


def _get_azure_jwks(tenant_id: str) -> dict[str, Any]:
    url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
    with httpx.Client() as client:
        r = client.get(url, timeout=10)
        r.raise_for_status()
        return r.json()


def _find_key(jwks: dict[str, Any], kid: str) -> dict[str, Any] | None:
    for key in jwks.get("keys", []):
        if key.get("kid") == kid:
            return key
    return None


def validate_azure_token(token: str, tenant_id: str, client_id: str) -> dict[str, Any]:
    """Validate Azure AD JWT and return decoded claims. Raises on invalid."""
    try:
        unverified = jwt.get_unverified_header(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    kid = unverified.get("kid")
    if not kid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing kid")
    jwks = _get_azure_jwks(tenant_id)
    key_data = _find_key(jwks, kid)
    if not key_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown key")
    try:
        rsa_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_data))
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid key")
    try:
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=client_id,
            options={"verify_aud": True},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    return payload


async def require_auth(request: Request) -> dict[str, Any]:
    """Dependency: require valid Azure AD Bearer token. Skip if auth not configured."""
    tenant_id = os.environ.get("CEMI_AAD_TENANT_ID")
    client_id = os.environ.get("CEMI_AAD_CLIENT_ID")
    if not tenant_id or not client_id:
        # Dev: no auth configured, allow through with mock identity
        return {"sub": "dev-user", "oid": "dev-oid"}

    auth = request.headers.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    token = auth[7:]
    return validate_azure_token(token, tenant_id, client_id)

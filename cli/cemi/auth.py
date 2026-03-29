"""MSAL device-code auth and token cache for CEMI CLI.

Retained for future cloud work, but not surfaced in the closed-beta CLI.
"""

from __future__ import annotations

import os
from pathlib import Path

import msal


ALLOWED_DOMAIN = os.environ.get("CEMI_ALLOWED_EMAIL_DOMAIN", "").strip().lower()


def _load_cache(cache_path: Path) -> msal.SerializableTokenCache:
    cache = msal.SerializableTokenCache()
    if cache_path.exists():
        cache.deserialize(cache_path.read_text())
    return cache


def _save_cache(cache_path: Path, cache: msal.SerializableTokenCache) -> None:
    if cache.has_state_changed:
        cache_path.write_text(cache.serialize())
        try:
            os.chmod(cache_path, 0o600)
        except OSError:
            pass


def _build_app(
    client_id: str,
    authority: str,
    cache: msal.SerializableTokenCache,
) -> msal.PublicClientApplication:
    return msal.PublicClientApplication(
        client_id=client_id,
        authority=authority,
        token_cache=cache,
    )


def ensure_domain(result: dict) -> None:
    if not ALLOWED_DOMAIN:
        return
    claims = result.get("id_token_claims") or {}
    username = (claims.get("preferred_username") or claims.get("upn") or "").lower()
    if not username.endswith("@" + ALLOWED_DOMAIN):
        raise RuntimeError(
            f"Only @{ALLOWED_DOMAIN} accounts are allowed (got: {username or 'unknown'})."
        )


def device_code_login(
    client_id: str,
    authority: str,
    scopes: list[str],
    cache_path: Path,
) -> dict:
    import json

    cache = _load_cache(cache_path)
    app = _build_app(client_id, authority, cache)

    flow = app.initiate_device_flow(scopes=scopes)
    if "user_code" not in flow:
        raise RuntimeError(f"Failed to start device flow: {json.dumps(flow, indent=2)}")

    print(flow["message"], flush=True)
    result = app.acquire_token_by_device_flow(flow)

    if "access_token" not in result:
        err = result.get("error", "")
        desc = result.get("error_description", "")
        if "AADSTS7000218" in desc or "client_assertion" in desc or "client_secret" in desc:
            raise RuntimeError(
                "Auth failed: this app registration requires a client secret. "
                "For CLI device-code flow, in Azure Portal go to App registration → Authentication → "
                "Advanced settings → set 'Allow public client flows' to Yes, then try again."
            )
        raise RuntimeError(f"Auth failed: {err} - {desc}")

    ensure_domain(result)
    _save_cache(cache_path, cache)
    return result


def acquire_token_silent(
    client_id: str,
    authority: str,
    scopes: list[str],
    cache_path: Path,
) -> str | None:
    cache = _load_cache(cache_path)
    app = _build_app(client_id, authority, cache)

    accounts = app.get_accounts()
    if not accounts:
        return None

    result = app.acquire_token_silent(scopes=scopes, account=accounts[0])
    if result and "access_token" in result:
        _save_cache(cache_path, cache)
        return result["access_token"]
    return None

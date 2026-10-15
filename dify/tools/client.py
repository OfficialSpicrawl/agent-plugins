"""Thin client for the Spicrawl REST API (https://docs.spicrawl.com/api-reference/introduction)."""

import json
from typing import Any

import requests

API_BASE = "https://api.spicrawl.com"
USER_AGENT = "spicrawl-dify-plugin/0.1.4"
# Target statuses Spicrawl bills as a success; anything else is returned at 0 credits.
BILLED_STATUSES = (200, 404, 410)


class SpicrawlError(Exception):
    """A readable failure from the Spicrawl API or from bad tool input."""


def api_key(credentials: dict[str, Any]) -> str:
    key = (credentials.get("spicrawl_api_key") or "").strip()
    if not key:
        raise SpicrawlError("Spicrawl API key is not set. Add it in the plugin's authorization settings.")
    return key


def request(
    key: str,
    method: str,
    path: str,
    *,
    json: Any = None,
    params: dict[str, Any] | None = None,
    timeout: int = 120,
) -> requests.Response:
    """Call the API; raise SpicrawlError carrying the problem+json code, detail and hint on failure."""
    try:
        r = requests.request(
            method,
            API_BASE + path,
            headers={"Authorization": f"Bearer {key}", "User-Agent": USER_AGENT},
            json=json,
            params=params,
            timeout=timeout,
        )
    except requests.RequestException as e:
        raise SpicrawlError(f"Could not reach the Spicrawl API: {type(e).__name__}") from None
    if r.ok:
        return r
    try:
        p = r.json()
    except ValueError:
        p = None
    p = p if isinstance(p, dict) else {}
    msg = f"{p.get('code') or f'HTTP {r.status_code}'}: {p.get('detail') or p.get('title') or r.reason}"
    hint = (p.get("diagnostics") or {}).get("hint")
    if hint:
        msg += f" Hint: {hint}"
    if p.get("retryable"):
        msg += " (retryable)"
    raise SpicrawlError(msg)


def split_list(value: Any) -> list[str]:
    """'a, b' -> ['a', 'b']; empty or missing -> []."""
    return [x.strip() for x in str(value or "").split(",") if x.strip()]


def render_options(p: dict[str, Any]) -> dict[str, Any]:
    """Rendering and proxy fields shared by every tool. wait_for needs rendering, so it implies js_render."""
    body: dict[str, Any] = {}
    wait_for = str(p.get("wait_for") or "").strip()
    if p.get("js_render") or wait_for:
        body["js_render"] = True
    if wait_for:
        body["wait_for"] = wait_for
    proxy = str(p.get("proxy") or "").strip()
    if proxy:
        body["proxy"] = proxy
    return body


def to_int(value: Any) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def not_billed_note(target_status: int) -> str:
    return (
        f"The site answered HTTP {target_status}, so nothing was billed and no usable content was returned. "
        "Try enabling JavaScript rendering, or send the request through your own proxy."
    )


def page_content(content: str, response_format: str) -> Any:
    """A batch result's `content` is the page as a plain string; for response_format=json it is JSON text.

    Tolerant of a non-json format whose content is itself one JSON string literal: that is decoded once.
    """
    if response_format == "json":
        try:
            return json.loads(content)
        except ValueError:
            return content
    if content.startswith('"'):
        try:
            decoded = json.loads(content)
        except ValueError:
            return content
        if isinstance(decoded, str):
            return decoded
    return content

import json
from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage

from .client import BILLED_STATUSES, SpicrawlError, api_key, not_billed_note, render_options, request


class ExtractTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        p = tool_parameters
        url = str(p.get("url") or "").strip()
        if not url:
            raise SpicrawlError("URL is required.")
        body: dict[str, Any] = {"url": url, "response_format": "json", **render_options(p)}  # json = the envelope, without a FORMAT_COERCED warning
        raw = str(p.get("fields") or "").strip()
        if raw:
            try:
                fields = json.loads(raw)
            except ValueError as e:
                raise SpicrawlError(f"Fields must be valid JSON: {e}") from None
            if not isinstance(fields, dict) or not fields:
                raise SpicrawlError('Fields must be a non-empty JSON object, for example {"title": "h1"}.')
            body["extract"] = fields
        if p.get("autoparse"):
            body["autoparse"] = True
        if "extract" not in body and "autoparse" not in body:
            raise SpicrawlError("Provide Fields, or turn on Autoparse.")

        r = request(api_key(self.runtime.credentials), "POST", "/v1/scrape", json=body)
        env = r.json()  # extraction always returns the JSON envelope; its page body is not forwarded
        target_status = env.get("status") or 200
        out = {
            "data": env.get("data"),
            "empty_fields": env.get("empty_fields") or [],
            "target_status": target_status,
            "final_url": env.get("final_url"),
            "credits": env.get("credits"),
            "warnings": env.get("warnings") or [],
            "request_id": r.headers.get("X-Request-Id"),
        }
        if target_status in BILLED_STATUSES:
            yield self.create_text_message(json.dumps(out["data"], ensure_ascii=False))
        else:
            yield self.create_text_message(not_billed_note(target_status))
        yield self.create_json_message({k: v for k, v in out.items() if v is not None})

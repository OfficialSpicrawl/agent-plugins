from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage

from .client import BILLED_STATUSES, SpicrawlError, api_key, not_billed_note, render_options, request, split_list, to_int


class ScrapeTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        p = tool_parameters
        url = str(p.get("url") or "").strip()
        if not url:
            raise SpicrawlError("URL is required.")
        fmt = p.get("response_format") or "markdown"
        body: dict[str, Any] = {"url": url, "response_format": fmt, **render_options(p)}
        if fmt != "html":  # main-content isolation only applies to markdown and text
            body["main_content_only"] = p.get("main_content_only") is not False
        for field in ("include_tags", "exclude_tags"):
            if tags := split_list(p.get(field)):
                body[field] = tags

        r = request(api_key(self.runtime.credentials), "POST", "/v1/scrape", json=body)
        if "pdf" in r.headers.get("Content-Type", ""):
            raise SpicrawlError("The page is a PDF. Choose Markdown or Text to read it.")
        target_status = to_int(r.headers.get("X-Target-Status")) or 200
        meta = {
            "url": url,
            "target_status": target_status,
            "credits": to_int(r.headers.get("X-Credits-Charged")),
            "engine": r.headers.get("X-Engine"),
            "cache": r.headers.get("Cache-State"),
            "warning": r.headers.get("X-Warning"),
            "request_id": r.headers.get("X-Request-Id"),
        }
        yield self.create_text_message(r.text if target_status in BILLED_STATUSES else not_billed_note(target_status))
        yield self.create_json_message({k: v for k, v in meta.items() if v is not None})

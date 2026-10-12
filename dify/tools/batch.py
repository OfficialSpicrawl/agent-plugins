import json
import time
from collections.abc import Generator
from typing import Any

from dify_plugin import Tool
from dify_plugin.entities.tool import ToolInvokeMessage

from .client import SpicrawlError, api_key, page_content, render_options, request

MAX_URLS = 100
POLL_SECONDS = 3
TERMINAL = ("completed", "failed", "cancelled")


class BatchTool(Tool):
    def _invoke(self, tool_parameters: dict[str, Any]) -> Generator[ToolInvokeMessage, None, None]:
        p = tool_parameters
        key = api_key(self.runtime.credentials)
        wait = min(max(int(p.get("wait_seconds") or 60), 5), 240)
        job_id = str(p.get("job_id") or "").strip()

        if not job_id:
            urls = [u.rstrip(",") for u in str(p.get("urls") or "").split()]
            if not urls:
                raise SpicrawlError("Provide URLs (one per line), or a Job ID to collect an earlier job.")
            if len(urls) > MAX_URLS:
                raise SpicrawlError(f"At most {MAX_URLS} URLs per call; got {len(urls)}.")
            fmt = p.get("response_format") or "markdown"
            body: dict[str, Any] = {"name": "dify", "urls": urls, "response_format": fmt, **render_options(p)}
            if fmt != "html":
                body["main_content_only"] = True
            job_id = request(key, "POST", "/v1/batch", json=body, timeout=60).json()["id"]

        deadline = time.monotonic() + wait
        while True:
            job = request(key, "GET", f"/v1/batch/{job_id}", timeout=30).json()
            if job["status"] in TERMINAL or time.monotonic() >= deadline:
                break
            time.sleep(min(POLL_SECONDS, max(0.0, deadline - time.monotonic())))

        progress = job.get("progress") or {}
        summary = {"job_id": job_id, "status": job["status"], "progress": progress}
        if job["status"] not in TERMINAL:
            yield self.create_text_message(
                f"Job {job_id} is still {job['status']} ({progress.get('completed')}/{progress.get('total')} done). "
                "Run this tool again with this Job ID to collect the results; they are kept for 72 hours."
            )
            yield self.create_json_message(summary)
            return

        # The job's own format: a job collected by Job ID may not match the form.
        fmt = (job.get("params") or {}).get("response_format") or "markdown"
        sections, items = [], []
        cursor = None
        while True:
            # limit=4 keeps a page under the API's 2 MiB page cap even at the 512 KiB per-item cap.
            params: dict[str, Any] = {"limit": 4, **({"cursor": cursor} if cursor else {})}
            r = request(key, "GET", f"/v1/batch/{job_id}/results", params=params, timeout=60)
            for line in r.text.splitlines():
                if not line.strip():
                    continue
                it = json.loads(line)
                res = it.get("result") or {}
                note = None
                if it["status"] == "succeeded":
                    if "content" not in res:
                        note = "content unavailable"
                    else:
                        content = res["content"]
                        if res.get("truncated"):
                            note = "content truncated at 512 KiB"
                        else:
                            content = page_content(content, fmt)
                        if not isinstance(content, str):
                            content = json.dumps(content, ensure_ascii=False, indent=2)
                        sections.append(f"## {it['url']}\n\n{content}")
                items.append(
                    {
                        "url": it["url"],
                        "status": it["status"],
                        "target_status": it.get("http_status"),
                        "error": (it.get("error") or {}).get("code"),
                        "note": note,
                    }
                )
            cursor = r.headers.get("X-Next-Cursor")
            if not cursor:
                break

        yield self.create_text_message("\n\n---\n\n".join(sections) or "No page content was returned.")
        yield self.create_json_message(
            {**summary, "items": [{k: v for k, v in i.items() if v is not None} for i in items]}
        )

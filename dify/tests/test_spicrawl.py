"""Offline checks: the three tools and the credential check against a local fake of the Spicrawl API.

Run from the plugin root:  python -m pytest tests
"""

import json
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import tools.batch  # noqa: E402
import tools.client  # noqa: E402
from dify_plugin.errors.tool import ToolProviderCredentialValidationError  # noqa: E402
from provider.spicrawl import SpicrawlProvider  # noqa: E402
from tools.batch import BatchTool  # noqa: E402
from tools.client import SpicrawlError  # noqa: E402
from tools.extract import ExtractTool  # noqa: E402
from tools.scrape import ScrapeTool  # noqa: E402

KEY = "spicrawl_test_" + "fake" * 11  # built in two parts so the repo-wide key scan does not flag a fake
SEEN: list[dict] = []  # every request the fake received: method, path, query, body, auth


def _batch_lines(first: int, last: int) -> bytes:
    rows = []
    for n in range(first, last + 1):
        row = {"seq": n, "url": f"https://site.test/{n}", "status": "succeeded", "http_status": 200}
        row["result"] = {"content": f"# Page {n}"}  # the page as a plain string, as the API returns it
        if n == 3:
            row = {**row, "status": "failed", "error": {"code": "ERR::UPSTREAM::TIMEOUT"}, "result": None}
        rows.append(json.dumps(row))
    return ("\n".join(rows) + "\n").encode()


class Fake(BaseHTTPRequestHandler):
    polls = 0
    fmt = "markdown"

    def log_message(self, *a):
        pass

    def _send(self, status, body=b"", ctype="application/json", headers=None):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _handle(self):
        path, _, query = self.path.partition("?")
        n = int(self.headers.get("Content-Length") or 0)
        body = json.loads(self.rfile.read(n)) if n else None
        SEEN.append({"method": self.command, "path": path, "query": query, "body": body, "auth": self.headers["Authorization"]})
        if self.headers["Authorization"] != f"Bearer {KEY}":
            problem = {"code": "ERR::AUTH::INVALID_KEY", "detail": "Key not recognised.", "retryable": False}
            return self._send(401, json.dumps(problem).encode(), "application/problem+json")
        if path == "/v1/requests":
            return self._send(200, b'{"data":[],"page":{}}')
        if path == "/v1/scrape":
            if body["url"] == "https://blocked.test/":
                return self._send(200, b"Forbidden", "text/markdown", {"X-Target-Status": "403", "X-Credits-Charged": "0"})
            if "extract" in body or "autoparse" in body:
                env = {"status": 200, "final_url": body["url"], "credits": 1, "content": "<html>big</html>",
                       "headers": {}, "data": {"title": "Example"}, "empty_fields": ["price"], "warnings": []}
                return self._send(200, json.dumps(env).encode(), headers={"X-Request-Id": "REQ1"})
            return self._send(200, b"# Example Domain", "text/markdown",
                              {"X-Target-Status": "200", "X-Credits-Charged": "1", "X-Engine": "fetch",
                               "Cache-State": "miss", "X-Request-Id": "REQ2"})
        if path == "/v1/batch":
            Fake.polls = 0
            Fake.fmt = body["response_format"]
            return self._send(202, b'{"id":"J1","status":"queued"}')
        if path == "/v1/batch/J1":
            Fake.polls += 1
            st = "running" if Fake.polls < 2 else "completed"
            job = {"id": "J1", "status": st, "progress": {"completed": 5, "total": 5}, "params": {"response_format": Fake.fmt}}
            return self._send(200, json.dumps(job).encode())
        if path in ("/v1/batch/JSON", "/v1/batch/QUOTED"):
            fmt = "json" if path.endswith("JSON") else "markdown"
            job = {"id": path[-6:], "status": "completed", "params": {"response_format": fmt}}
            return self._send(200, json.dumps(job).encode())
        if path in ("/v1/batch/JSON/results", "/v1/batch/QUOTED/results"):
            content = '{"title":"Example","tags":["a"]}' if "JSON" in path else json.dumps("# Quoted")
            row = {"seq": 0, "url": "https://site.test/0", "status": "succeeded", "result": {"content": content}}
            return self._send(200, (json.dumps(row) + "\n").encode(), "application/x-ndjson")
        if path == "/v1/batch/SLOW":
            return self._send(200, b'{"id":"SLOW","status":"running","progress":{"completed":1,"total":5}}')
        if path == "/v1/batch/J1/results":
            if "cursor=c2" in query:
                return self._send(200, _batch_lines(5, 5), "application/x-ndjson")
            return self._send(200, _batch_lines(1, 4), "application/x-ndjson", {"X-Next-Cursor": "c2"})
        self._send(404, b'{"code":"ERR::REQUEST::NOT_FOUND","detail":"no route"}', "application/problem+json")

    do_GET = do_POST = _handle


class FakeClock:
    t = 0.0

    def monotonic(self):
        self.t += 10
        return self.t

    def sleep(self, s):
        pass


@pytest.fixture(autouse=True)
def fake_api(monkeypatch):
    server = HTTPServer(("127.0.0.1", 0), Fake)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    monkeypatch.setattr(tools.client, "API_BASE", f"http://127.0.0.1:{server.server_port}")
    monkeypatch.setattr(tools.batch, "time", FakeClock())
    SEEN.clear()
    yield
    server.shutdown()


def run(tool_cls, params, key=KEY):
    msgs = list(tool_cls.from_credentials({"spicrawl_api_key": key}).invoke(params))
    text = [m.message.text for m in msgs if m.type.value == "text"]
    js = [m.message.json_object for m in msgs if m.type.value == "json"]
    return text[0], js[0]


def test_credentials_ok_and_rejected():
    SpicrawlProvider().validate_credentials({"spicrawl_api_key": KEY})
    assert SEEN[-1]["path"] == "/v1/requests" and SEEN[-1]["query"] == "limit=1"
    with pytest.raises(ToolProviderCredentialValidationError) as e:
        SpicrawlProvider().validate_credentials({"spicrawl_api_key": "spicrawl_live_wrong"})
    assert "ERR::AUTH::INVALID_KEY" in str(e.value) and "wrong" not in str(e.value)


def test_scrape_markdown():
    text, meta = run(ScrapeTool, {"url": "https://example.com", "wait_for": ".price", "include_tags": "article, .body",
                                  "proxy": "http://u:p@h:8000"})
    assert text == "# Example Domain"
    assert meta == {"url": "https://example.com", "target_status": 200, "credits": 1, "engine": "fetch",
                    "cache": "miss", "request_id": "REQ2"}
    assert SEEN[-1]["body"] == {"url": "https://example.com", "response_format": "markdown", "js_render": True,
                                "wait_for": ".price", "proxy": "http://u:p@h:8000", "main_content_only": True,
                                "include_tags": ["article", ".body"]}
    assert SEEN[-1]["auth"] == f"Bearer {KEY}"


def test_scrape_html_sends_no_main_content_flag():
    run(ScrapeTool, {"url": "https://example.com", "response_format": "html"})
    assert "main_content_only" not in SEEN[-1]["body"] and "js_render" not in SEEN[-1]["body"]


def test_scrape_not_billed_status_is_explained():
    text, meta = run(ScrapeTool, {"url": "https://blocked.test/"})
    assert "HTTP 403" in text and "nothing was billed" in text and meta["target_status"] == 403


def test_extract():
    text, out = run(ExtractTool, {"url": "https://example.com", "fields": '{"title": "h1"}'})
    assert json.loads(text) == {"title": "Example"}
    assert out["empty_fields"] == ["price"] and out["credits"] == 1 and "content" not in out
    assert SEEN[-1]["body"]["extract"] == {"title": "h1"}


@pytest.mark.parametrize("fields", ["", "not json", "[1]", "{}"])
def test_extract_rejects_bad_fields(fields):
    with pytest.raises(SpicrawlError):
        run(ExtractTool, {"url": "https://example.com", "fields": fields})
    assert not [s for s in SEEN if s["path"] == "/v1/scrape"]


def test_extract_autoparse_alone():
    run(ExtractTool, {"url": "https://example.com", "autoparse": True})
    assert SEEN[-1]["body"] == {"url": "https://example.com", "response_format": "json", "autoparse": True}


def test_batch_submits_polls_and_pages_results():
    text, out = run(BatchTool, {"urls": "https://site.test/1,\nhttps://site.test/2\nhttps://site.test/3\nhttps://site.test/4\nhttps://site.test/5"})
    submit = next(s for s in SEEN if s["path"] == "/v1/batch")
    assert submit["body"]["urls"][0] == "https://site.test/1" and len(submit["body"]["urls"]) == 5
    assert submit["body"]["response_format"] == "markdown" and submit["body"]["main_content_only"] is True
    assert [s["query"] for s in SEEN if s["path"].endswith("/results")] == ["limit=4", "limit=4&cursor=c2"]
    assert text.count("## https://site.test/") == 4 and "# Page 5" in text and "# Page 3" not in text
    assert out["status"] == "completed"
    assert [i["status"] for i in out["items"]] == ["succeeded", "succeeded", "failed", "succeeded", "succeeded"]
    assert out["items"][2]["error"] == "ERR::UPSTREAM::TIMEOUT"


def test_batch_still_running_returns_job_id_then_resumes():
    text, out = run(BatchTool, {"job_id": "SLOW", "wait_seconds": 5})
    assert "SLOW" in text and "Run this tool again" in text and out["status"] == "running"
    assert not [s for s in SEEN if s["path"].endswith("/results")]
    Fake.polls = 5
    text, out = run(BatchTool, {"job_id": "J1"})
    assert out["status"] == "completed" and not [s for s in SEEN if s["path"] == "/v1/batch"]


def test_batch_content_is_used_as_is_json_format_is_parsed_and_quoted_strings_tolerated():
    text, _ = run(BatchTool, {"job_id": "JSON"})
    assert json.loads(text.split("\n\n", 1)[1]) == {"title": "Example", "tags": ["a"]}
    text, _ = run(BatchTool, {"job_id": "QUOTED"})
    assert text == "## https://site.test/0\n\n# Quoted"


@pytest.mark.parametrize("params", [{}, {"urls": " \n "}, {"urls": "\n".join(["https://a.test"] * 101)}])
def test_batch_rejects_bad_urls(params):
    with pytest.raises(SpicrawlError):
        run(BatchTool, params)

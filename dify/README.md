# Spicrawl for Dify

Scrape web pages from Dify workflows and agents with the [Spicrawl](https://spicrawl.com) API. Get clean markdown for LLMs, pull named fields out of a page, or scrape up to 100 URLs in one call.

- Source: https://github.com/OfficialSpicrawl/agent-plugins/tree/main/dify (in the [agent-plugins](https://github.com/OfficialSpicrawl/agent-plugins) repository)
- API docs: https://docs.spicrawl.com
- Contact: support@spicrawl.com
- Privacy: see [PRIVACY.md](PRIVACY.md)

## Setup

1. Create a Spicrawl API key at https://app.spicrawl.com/dashboard/keys. Keys look like `spicrawl_live_...` (spends credits) or `spicrawl_test_...` (cannot spend live credits). Give the key the `scrape` scope, plus `batch` if you will use Batch scrape. New keys have both by default.
2. In Dify, open **Plugins** and install **Spicrawl** from the `.difypkg` file on a [`dify-v*` release](https://github.com/OfficialSpicrawl/agent-plugins/releases) (Install plugin, then GitHub or Local Package File), then choose **To Authorize** and paste the key. Dify checks it with a free call that spends no credits.
3. Add a Spicrawl tool to a workflow node or to an agent.

Connection requirement: the Dify plugin runtime must be able to reach `https://api.spicrawl.com` over HTTPS (port 443). Nothing else is needed.

## Tools

### Scrape

Fetch one URL and return it as markdown (default), plain text or HTML.

| Parameter | Description |
|---|---|
| URL | The http(s) page to fetch. |
| JavaScript rendering | Run the page's JavaScript first. Turn it on when a normal scrape returns an empty or "loading" page. Costs more credits. |
| Output format | Markdown, Plain text or HTML. |
| Main content only | Drop navigation, footers and sidebars (Markdown and Text). On by default. |
| Wait for selector | CSS selector to wait for before capture, such as `.price`. Turns on JavaScript rendering. |
| Include / Exclude selectors | Comma-separated CSS selectors. Include keeps only matching parts; exclude removes them. Both cut tokens. |
| Proxy URL | Optional. Route the request through your own proxy (`http`, `https`, `socks5`, `socks5h`). |

Outputs: `text` is the page content; `json` holds `target_status` (the site's HTTP status), `credits`, `cache`, `request_id` and any `warning`. If the site answers with an error status the request is not billed and `text` says so.

### Extract

Return named fields from one page as JSON.

| Parameter | Description |
|---|---|
| URL | The page to extract from. |
| Fields (JSON) | A JSON object mapping a field name to a CSS selector, for example `{"title": "h1", "price": ".price", "next": "a.next@href"}`. Append `@attribute` to read an attribute. A rule object such as `{"selector": ".tag", "kind": "list"}` returns every match. |
| Autoparse | Also return the page's own metadata (JSON-LD, OpenGraph, Twitter card, microdata, embedded app state). No selectors needed. |
| JavaScript rendering / Wait for selector / Proxy URL | As in Scrape. |

Provide Fields, Autoparse, or both. Outputs: `text` is the extracted `data` as JSON; `json` holds `data`, `empty_fields` (selectors that matched nothing, the first sign a site changed its markup), `target_status`, `credits` and `request_id`. Extraction costs no more than a plain scrape.

### Batch scrape

Scrape up to 100 URLs as one job and wait for it to finish.

| Parameter | Description |
|---|---|
| URLs | One http(s) URL per line. |
| Job ID | Instead of URLs: collect the results of an earlier job that was still running. |
| Output format | Markdown, Plain text or HTML. |
| JavaScript rendering | Render every page with JavaScript. |
| Max wait (seconds) | How long to wait for the job, 5 to 240 (default 60). If the job is still running, the tool returns its Job ID; run the tool again with that Job ID. Results are kept for 72 hours. |
| Proxy URL | As in Scrape. |

Outputs: `text` holds each page as a `## <url>` section; `json` holds the job ID, status, progress and one entry per URL (`status`, `target_status`, `error`). Batch items do not support extraction; use Extract per URL.

## Cost

A plain fetch costs 1 credit and JavaScript rendering costs 3. Failures cost nothing. Markdown conversion, selectors and extraction add nothing. See https://docs.spicrawl.com/credits.

## Errors

Failures show the Spicrawl error code, its detail and a hint, for example `ERR::AUTH::INSUFFICIENT_SCOPE` when the key lacks the `batch` scope, or `ERR::UPSTREAM::TIMEOUT` (retryable). Full list: https://docs.spicrawl.com/errors.

## Security notes

- The plugin only calls the fixed HTTPS endpoint `https://api.spicrawl.com`. It runs no code, commands or SQL and uses no filesystem or Dify storage.
- It fetches URLs you or your agent supply, through Spicrawl, which refuses private and reserved addresses. Constrain the URL input in workflows that take it from untrusted users.
- Requests have timeouts and the API key never appears in errors or output.
- The optional Proxy URL may contain credentials. Treat the node configuration that holds it like any other secret.

## Development

```bash
pip install -r requirements.txt pytest
python -m pytest tests          # offline: runs against a local fake API
dify plugin package .           # builds spicrawl.difypkg
```

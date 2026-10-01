# Spicrawl

Spicrawl is a web scraping API. This extension connects Gemini CLI to the hosted Spicrawl MCP
server at `https://mcp.spicrawl.com/mcp`. The tools are named `spicrawl_*`.

Use them to:

- Scrape one page as Markdown (default), HTML, text or JSON: `spicrawl_scrape`.
- Run a batch job over a list of URLs: `spicrawl_batch_submit`, then `spicrawl_batch_status` and
  `spicrawl_batch_results`.
- Keep a logged-in session (cookies and storage) and reuse it with `session_id`:
  `spicrawl_session_create` and the other `spicrawl_session_*` tools.
- Look up past requests and failures: `spicrawl_requests_list`, `spicrawl_request_get`.
- Read usage: `spicrawl_usage`, `spicrawl_usage_summary`, `spicrawl_usage_reconciliation`. These
  need an API key with the `read` scope.
- Search Spicrawl's docs: `spicrawl_docs_search`, `spicrawl_docs_read`, `spicrawl_docs_index`.

## Rules

- Start with the cheapest request: `format: markdown`, no rendering. If the content is empty or a
  skeleton, retry with `render: true`.
- Check the target site's status, not only the API's. Errors carry a `code` and a `retryable` flag;
  retry only when `retryable` is true, and back off.
- A failed request costs 0 credits, but a retried successful request is billed again. Set
  `max_cost` to cap spend. Results are cached by default; send `cache: false` for prices, stock or
  anything else that changes quickly. A cache hit is billed at the same price as the fetch that
  stored it, so the cache saves time, not credits.
- Use a batch job instead of a loop for more than about 20 URLs.
- Do not use `spicrawl_browser_connect_url` or any option the tool schema does not list.
- Coming soon, not available yet: AI extraction, stealth mode, Spicrawl's managed proxy pool and the remote browser. Do not plan around them.
- When unsure about a parameter or an error code, call `spicrawl_docs_search`.
- Never print or log the API key.

Docs: https://docs.spicrawl.com/agents/mcp. Contact: dev@spicrawl.com.

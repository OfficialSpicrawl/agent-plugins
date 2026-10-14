# Spicrawl

Spicrawl is a web scraping API for AI agents. This plugin connects Cursor to the hosted Spicrawl
[Model Context Protocol](https://modelcontextprotocol.io/) server and adds the `spicrawl` skill,
which teaches the agent how to use it.

With it, Cursor's agent can:

- scrape a web page to Markdown, HTML, text or JSON, with fields extracted by CSS selectors when
  you ask for them;
- run batch jobs over lists of URLs and read the results as they finish;
- keep persistent login sessions (cookies and storage) across requests;
- read its request history, credits and usage;
- search Spicrawl's own documentation.

## Install

Until the plugin is listed in the Cursor marketplace, copy it into Cursor's local plugins folder
and restart Cursor:

```sh
git clone https://github.com/OfficialSpicrawl/agent-plugins.git
mkdir -p ~/.cursor/plugins/local
cp -r agent-plugins/plugins/spicrawl ~/.cursor/plugins/local/spicrawl
```

Once it is listed, install it from Cursor Settings, Plugins instead. The key setup below is the
same either way.

## Set your API key

1. Create a key at <https://app.spicrawl.com>. Keys look like `spicrawl_live_...` or
   `spicrawl_test_...`.
2. In Cursor open Plugins, choose Configure on Spicrawl, and set `SPICRAWL_API_KEY`.

The plugin declares `SPICRAWL_API_KEY` as a required variable and Cursor puts it in the
`Authorization: Bearer` header of the MCP server. It is a plugin variable, not a shell environment
variable, and no key is stored in this repository. The tools list without a key but cannot be
called until one is set. The usage tools (`spicrawl_usage`, `spicrawl_usage_summary`,
`spicrawl_usage_reconciliation`) need a key with the `read` scope.

## What is in the plugin

| Component | Path | What it does |
|---|---|---|
| MCP server | `mcp/cursor.json` | `spicrawl` at `https://mcp.spicrawl.com/mcp` (Streamable HTTP, API key as a Bearer token, no OAuth) |
| Skill | `skills/spicrawl/SKILL.md` | When to use each tool, the HTTP API and CLI reference, error handling |

The server offers 24 `spicrawl_*` tools:

| Tools | Use them to |
|---|---|
| `spicrawl_scrape` | Fetch one URL as Markdown, HTML, text or JSON; extract fields; take a screenshot |
| `spicrawl_batch_submit`, `_list`, `_status`, `_results`, `_task_content`, `_add_items`, `_close`, `_retry`, `_cancel` | Run and manage batch jobs over many URLs |
| `spicrawl_session_create`, `_list`, `_get`, `_context`, `_release`, `_delete` | Keep a logged-in session across requests |
| `spicrawl_requests_list`, `spicrawl_request_get` | Look up request history and failures |
| `spicrawl_usage`, `spicrawl_usage_summary`, `spicrawl_usage_reconciliation` | Read credits and volume |
| `spicrawl_docs_search`, `spicrawl_docs_read`, `spicrawl_docs_index` | Search and read Spicrawl's documentation |

Each successful scrape is billed in credits and a failure costs nothing; see
<https://docs.spicrawl.com/credits>.

## Data

A tool call sends your API key and the arguments the agent chose (for example the URL to fetch) to
`mcp.spicrawl.com`, which fetches the page and returns the content. Spicrawl keeps your request
history, which the request tools read back. The plugin itself runs no local code. See the privacy
policy below.

## Links

- Setup guide: <https://docs.spicrawl.com/agents/cursor>
- MCP server reference: <https://docs.spicrawl.com/agents/mcp>
- Website: <https://spicrawl.com>
- Support: <dev@spicrawl.com>
- Terms: <https://spicrawl.com/terms>
- Privacy policy: <https://spicrawl.com/privacy>
- Source and other tools (Claude Code, Codex, Gemini CLI and more):
  <https://github.com/OfficialSpicrawl/agent-plugins>

## License

Apache License 2.0. See [LICENSE](LICENSE).

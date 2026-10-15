# Spicrawl: web scraping for AI coding agents

**How do I give Claude Code, Cursor, Codex or Gemini CLI web scraping?** Connect the agent to
Spicrawl's hosted [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server at
`https://mcp.spicrawl.com/mcp`. This plugin does that for Cursor, and the same folder also serves
Claude Code, Factory Droid, Devin and GitHub Copilot CLI; Codex and Gemini CLI have their own
packages in the same repository (see the table below). Through the full server the agent has 24
`spicrawl_*` tools to fetch a web page as clean Markdown (or HTML, text or JSON), render pages that
need JavaScript, extract fields with CSS selectors, run batch jobs and keep login sessions. You
need an API key from <https://app.spicrawl.com>.

Spicrawl is a web scraping API for AI agents. This plugin connects Cursor to the hosted Spicrawl MCP
server and adds the `spicrawl` skill, which teaches the agent how to use it.

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

## Supported tools

The same Spicrawl server works in more than Cursor. Each tool needs an API key; the
[repository README](https://github.com/OfficialSpicrawl/agent-plugins#readme) has the key setup for each.

| Tool | Install |
|---|---|
| Cursor | the steps under [Install](#install) below |
| Claude Code | `claude plugin marketplace add OfficialSpicrawl/agent-plugins && claude plugin install spicrawl@spicrawl-plugins` |
| Codex | `codex plugin marketplace add OfficialSpicrawl/agent-plugins`, then install `spicrawl` from `/plugins` (the key goes in your Codex config; see the [repository README](https://github.com/OfficialSpicrawl/agent-plugins#chatgpt-and-codex)) |
| Gemini CLI | `gemini extensions install https://github.com/OfficialSpicrawl/agent-plugins` |
| OpenCode | `"plugin": ["opencode-spicrawl"]` in `opencode.json` |
| Factory Droid | `droid plugin marketplace add OfficialSpicrawl/agent-plugins && droid plugin install spicrawl@spicrawl-plugins --scope user` |
| GitHub Copilot CLI | `copilot plugin marketplace add OfficialSpicrawl/agent-plugins && copilot plugin install spicrawl@spicrawl-plugins` (skill only; add the MCP server as the [repository README](https://github.com/OfficialSpicrawl/agent-plugins#github-copilot-cli) shows) |
| Devin | `devin plugins install --local ./plugins/spicrawl`, from a clone of the repository |
| Dify | Plugins, Marketplace, search "Spicrawl" |
| n8n | `npm install n8n-nodes-spicrawl` in `~/.n8n/nodes`, or Settings, Community Nodes, Install |
| Any MCP client | `https://mcp.spicrawl.com/mcp` (Streamable HTTP, header `Authorization: Bearer <key>`) |

## Where to find Spicrawl

- Cursor Directory: <https://cursor.directory/plugins/spicrawl>
- Smithery: <https://smithery.ai/servers/spicrawl/web-scraper>
- Dify Marketplace: <https://marketplace.dify.ai/plugin/spicrawl/spicrawl>
- npm: [`@spicrawl/mcp`](https://www.npmjs.com/package/@spicrawl/mcp) (the MCP server),
  [`opencode-spicrawl`](https://www.npmjs.com/package/opencode-spicrawl) and
  [`n8n-nodes-spicrawl`](https://www.npmjs.com/package/n8n-nodes-spicrawl)

## Data

A tool call sends your API key and the arguments the agent chose (for example the URL to fetch) to
`mcp.spicrawl.com`, which fetches the page and returns the content. Spicrawl keeps your request
history, which the request tools read back. The plugin itself runs no local code. See the privacy
policy below.

## FAQ

### How do I add web scraping to Cursor?

Copy this plugin into Cursor's local plugins folder (see [Install](#install)), then set
`SPICRAWL_API_KEY` under Plugins, Configure. Ask the agent to read a URL and it calls
`spicrawl_scrape`.

### What is MCP, and which server does this plugin use?

MCP, the Model Context Protocol, is an open protocol that lets an AI app call external tools. This
plugin connects to Spicrawl's hosted server at `https://mcp.spicrawl.com/mcp` over Streamable HTTP,
with your API key as a bearer token. Spicrawl fetches the page and returns the content, so the
plugin itself runs no code on your machine.

### Does it work on pages that need JavaScript?

Yes. If a plain fetch comes back empty, the agent can ask for JavaScript rendering. A plain fetch
costs 1 credit and JavaScript rendering costs 3.

### Can it crawl a whole website?

No. Spicrawl fetches the URLs you give it. To cover a site, collect the URLs (from a sitemap, for
example) and submit them as a batch job.

### Can it read pages behind a login?

A session keeps cookies and storage between requests, so the agent can sign in once and read
further pages with the same session. Use it only for sites and accounts you are allowed to access.

### How much does it cost?

Credits are charged only for successful requests, and a failed request costs 0. See
<https://docs.spicrawl.com/credits> for the price of each kind of request.

### Where does my API key go?

Only to Spicrawl, in the `Authorization` header of requests to `mcp.spicrawl.com`. See
[Data](#data). No key is stored in this repository.

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

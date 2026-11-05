# Spicrawl OpenAI Plugin

Fetch public web pages you name and return them as Markdown, HTML, text, or JSON. Render JavaScript pages, extract fields with CSS selectors, and run batch jobs over lists of URLs. You can also search Spicrawl's documentation.

This plugin works with your existing Spicrawl account.

## What it does

- `spicrawl_scrape` — fetch one public page in Markdown, HTML, text, or JSON.
- `spicrawl_batch_submit`, `spicrawl_batch_status`, `spicrawl_batch_results` — run batch jobs over up to 25 URLs.
- `spicrawl_docs_search`, `spicrawl_docs_read` — search and read Spicrawl docs.

The plugin only fetches public pages with GET requests. It cannot sign in to sites, solve CAPTCHAs, submit forms, or bypass access controls.

## Registered ChatGPT app ID (required for mobile and web)

To make the plugin available on ChatGPT mobile and web, you must provide a registered ChatGPT app ID. The file `.app.json` contains a placeholder:

```json
{
  "apps": {
    "spicrawl": {
      "id": "OPENAI_APP_ID"
    }
  }
}
```

Replace `OPENAI_APP_ID` with the real app ID from your OpenAI registered app before distribution. CI can inject this value during packaging.

## `.app.json` and `mcp.json` relationship

- `plugin.json` declares `"apps": "./.app.json"` under `extensions.com.openai`. OpenAI uses this mapping to link the plugin to a registered app, which unlocks mobile and web support.
- `mcp.json` defines the Model Context Protocol server configuration (transport, tools, and OAuth endpoints). The two files work together: `.app.json` registers the app identity, and `mcp.json` tells the host how to reach the MCP server.

## Install from a release ZIP

1. Download `spicrawl-openai-<version>.zip` from the [GitHub releases page](https://github.com/OfficialSpicrawl/agent-plugins/releases).
2. Make sure `.app.json` inside the ZIP contains the real `OPENAI_APP_ID` for your registered app (CI injects this automatically when building the release ZIP).
3. Upload the ZIP through the ChatGPT plugin or GPT installation flow.
4. Complete OAuth with your Spicrawl account when prompted.

## Releases

| Version | What changed |
|---|---|
| 0.2.3 | Added registered ChatGPT app mapping (`.app.json`) so the plugin is available on ChatGPT mobile and web, not only desktop. |
| 0.2.2 | Initial public release for ChatGPT/Codex: fetch, render, extract, batch, and docs search tools. |

For development details, see the [Spicrawl agent docs](https://docs.spicrawl.com/agents/mcp).

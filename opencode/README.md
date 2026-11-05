# opencode-spicrawl

[Spicrawl](https://spicrawl.com) plugin for [OpenCode](https://opencode.ai). It adds the Spicrawl MCP server to your OpenCode config, so agents can scrape pages to Markdown or JSON, run batch jobs, use persistent login sessions, look up request history and usage, and search the Spicrawl docs.

## Install

1. Create an API key at [app.spicrawl.com](https://app.spicrawl.com).

2. Export it where OpenCode runs:

   ```bash
   export SPICRAWL_API_KEY=spicrawl_live_...
   ```

3. Add the plugin to `opencode.json` (project) or `~/.config/opencode/opencode.json` (global):

   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "plugin": ["opencode-spicrawl"]
   }
   ```

OpenCode installs the package from npm on start. Check the connection with:

```bash
opencode mcp list
```

`spicrawl` should show as `connected`. Its tools are named `spicrawl_*`; ask the agent to scrape a URL and it will pick the right one.

## What it does

On startup the plugin adds this entry to OpenCode's config, in memory. It does not write to your config files:

```json
{
  "mcp": {
    "spicrawl": {
      "type": "remote",
      "url": "https://mcp.spicrawl.com/mcp",
      "oauth": false,
      "enabled": true,
      "headers": { "Authorization": "Bearer <SPICRAWL_API_KEY>" }
    }
  }
}
```

- If `SPICRAWL_API_KEY` is unset or blank, no server is added, so there is no failing connection. OpenCode logs one warning (`opencode run --print-logs` shows it).
- If your config already has an `mcp.spicrawl` entry, the plugin leaves it alone.
- Other MCP servers are untouched.

## Without the plugin

The same result with no plugin, in `opencode.json`:

```json
{
  "mcp": {
    "spicrawl": {
      "type": "remote",
      "url": "https://mcp.spicrawl.com/mcp",
      "oauth": false,
      "enabled": true,
      "headers": { "Authorization": "Bearer {env:SPICRAWL_API_KEY}" }
    }
  }
}
```

## Releases

The package is published to npm as [`opencode-spicrawl`](https://www.npmjs.com/package/opencode-spicrawl). OpenCode installs it automatically when it appears in your `opencode.json` plugin list.

You can also download the source ZIP from the [GitHub releases page](https://github.com/OfficialSpicrawl/agent-plugins/releases) for `opencode-spicrawl-v<version>`.

### Recent versions

| Version | What changed |
|---|---|
| 0.1.2 | Added automated GitHub and npm releases as part of the coordinated plugin release pipeline. |
| 0.1.1 | Updated repository links to `OfficialSpicrawl/agent-plugins`. |
| 0.1.0 | First release: adds the Spicrawl remote MCP server from `SPICRAWL_API_KEY`. |

## Links

- Docs: <https://docs.spicrawl.com/agents/opencode>
- API keys: <https://app.spicrawl.com>

## License

Apache-2.0

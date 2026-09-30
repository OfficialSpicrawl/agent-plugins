# Spicrawl agent plugins

Spicrawl's plugin for coding agents, in one repository. It connects an agent to the hosted
Spicrawl MCP server and gives it a skill that explains how to use it.

Spicrawl is a web scraping API for AI agents. Through the MCP server an agent can:

- scrape a web page to Markdown, HTML, text or JSON;
- run batch jobs over lists of URLs;
- keep persistent login sessions (cookies and storage);
- read its request history and its usage;
- search Spicrawl's docs.

This repository holds the packaging for these tools:

| Tool | What is installed |
|---|---|
| Claude Code | plugin (MCP server + skill) |
| Codex | plugin (MCP server + skill) |
| Cursor | plugin (MCP server + skill) |
| Factory Droid | plugin (MCP server + skill) |
| Devin | plugin (MCP server + skill), through Devin's marketplace |
| Gemini CLI | extension (MCP server + context file) |
| GitHub Copilot CLI | plugin (skill), plus one command for the MCP server |
| Any tool that reads Agent Skills | the skill only (`npx skills add`) |
| Any MCP client | the MCP server, by hand |

## Get an API key

Create a key at <https://app.spicrawl.com>. Keys look like `spicrawl_live_...` or
`spicrawl_test_...`. The usage tools (`spicrawl_usage`, `spicrawl_usage_summary`,
`spicrawl_usage_reconciliation`) need a key with the `read` scope.

Never commit a key. None of the files in this repository contain one.

## Install

The MCP server is `https://mcp.spicrawl.com/mcp` (Streamable HTTP). It authenticates with the
header `Authorization: Bearer <key>`. It does not use OAuth. Each tool below takes the key in the
way its plugin format allows.

### Claude Code

```sh
claude plugin marketplace add Spicrawl/agent-plugins
claude plugin install spicrawl@spicrawl-plugins
```

Claude Code asks for the API key when the plugin is enabled and stores it as a sensitive value.

### Codex

```sh
export SPICRAWL_API_KEY=spicrawl_live_...
codex plugin marketplace add Spicrawl/agent-plugins
```

Then run `/plugins` in Codex, pick the `Spicrawl` marketplace and install `spicrawl`. Codex reads
the key from `SPICRAWL_API_KEY` and sends it as the bearer token. Start Codex from a shell that
has the variable set.

### Cursor

```sh
export SPICRAWL_API_KEY=spicrawl_live_...   # in the environment Cursor is started from
```

Until the plugin is listed in the Cursor marketplace, copy `plugins/spicrawl` to
`~/.cursor/plugins/local/spicrawl` and restart Cursor. Cursor expands `${env:SPICRAWL_API_KEY}`
in the MCP header. To skip the plugin and add only the server, put this in `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "spicrawl": {
      "url": "https://mcp.spicrawl.com/mcp",
      "headers": { "Authorization": "Bearer ${env:SPICRAWL_API_KEY}" }
    }
  }
}
```

### Factory Droid

```sh
export SPICRAWL_AUTH="Bearer spicrawl_live_..."   # the whole header value, including "Bearer "
droid plugin marketplace add Spicrawl/agent-plugins
droid plugin install spicrawl@spicrawl-plugins --scope user
```

Droid expands `${SPICRAWL_AUTH}` from the shell environment when it connects. OAuth is disabled
for this server in the plugin's `mcp.json`.

### Devin

Devin installs plugins from its marketplace: Settings, Marketplace, pick `Spicrawl`, install.
Devin asks for one credential, `SPICRAWL_AUTHORIZATION`, whose value is the whole header value:
`Bearer spicrawl_live_...`. The manifest is `plugins/spicrawl/.devin-plugin/plugin.json`.

To reference the plugin from your own Devin plugin manifest, use a `git-subdir` source with
`"url": "https://github.com/Spicrawl/agent-plugins.git"` and `"path": "plugins/spicrawl"`, pinned
to a commit `sha`.

### Gemini CLI

```sh
gemini extensions install https://github.com/Spicrawl/agent-plugins
```

Gemini asks for one setting, "Spicrawl authorization header". Enter the whole header value:
`Bearer spicrawl_live_...`. To change it later: `gemini extensions config spicrawl`.
The extension loads `GEMINI.md` as context.

### GitHub Copilot CLI

```sh
copilot plugin marketplace add Spicrawl/agent-plugins
copilot plugin install spicrawl@spicrawl-plugins
```

This installs the skill. Copilot CLI's docs describe no environment-variable expansion for remote MCP server
settings, so a plugin cannot carry the key. Add the server with:

```sh
copilot mcp add --transport http spicrawl https://mcp.spicrawl.com/mcp \
  --header "Authorization: Bearer $SPICRAWL_API_KEY"
```

Your shell expands the variable, so the key is written to Copilot's MCP config file on your
machine.

### The skill alone (Agent Skills tools)

```sh
npx skills add Spicrawl/agent-plugins
```

This installs `plugins/spicrawl/skills/spicrawl/SKILL.md` into the agents you pick. The skill
describes the Spicrawl tools, the CLI and the HTTP API. It does not connect the MCP server.

### Any MCP client

| | |
|---|---|
| URL | `https://mcp.spicrawl.com/mcp` |
| Transport | Streamable HTTP |
| Header | `Authorization: Bearer <your key>` |
| OAuth | not used; turn automatic OAuth off if the client tries it |

## What is sent where

The API key is sent only to `mcp.spicrawl.com`, in the `Authorization` header of MCP requests.
The plugins here contain no key and run no code of their own: they are JSON manifests, a skill
file (Markdown) and a logo. Each tool reads the key from where its format allows: a sensitive
plugin setting (Claude Code, Gemini CLI), an environment variable (Codex, Cursor, Factory Droid),
a credential you enter in Devin, or the command you type (Copilot CLI, any MCP client).

The pages an agent asks Spicrawl to scrape, and the results, go through the same server.

## Docs and contact

- MCP server docs: <https://docs.spicrawl.com/agents/mcp>
- Website: <https://spicrawl.com>
- SDK: <https://github.com/Spicrawl/sdk>, CLI: <https://github.com/Spicrawl/cli> (Apache-2.0)
- Contact: dev@spicrawl.com

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).

## Maintainer notes

There is one skill and one logo, shared by every tool:

- `plugins/spicrawl/skills/spicrawl/SKILL.md`: the canonical skill. `name` equals its directory.
  The skills CLI finds it because `.claude-plugin/marketplace.json` lists `./plugins/spicrawl`,
  so no copy or symlink at the repository root is needed.
- `plugins/spicrawl/logo.png`: 180x180, used by the Cursor, Codex and Devin manifests.
- `plugins/spicrawl/.devin-plugin/plugin.json` is byte-identical to the copy submitted to Devin's
  marketplace. Change both together.

There is one MCP definition per format, in `plugins/spicrawl/`. They are separate files on
purpose: the same server needs a different credential syntax in each tool.

| File | Read by | Credential syntax |
|---|---|---|
| `mcp/claude.json` | Claude Code (`mcpServers` in `.claude-plugin/plugin.json`) | `${user_config.spicrawl_api_key}`, from `userConfig` with `sensitive: true` |
| `mcp/codex.json` | Codex (`mcpServers` in `.codex-plugin/plugin.json`) | `bearer_token_env_var` |
| `mcp/cursor.json` | Cursor (`mcpServers` in `.cursor-plugin/plugin.json`) | `${env:SPICRAWL_API_KEY}` |
| `mcp.json` | Factory Droid (fixed root path) | `${SPICRAWL_AUTH}` as the whole header value, `oauth: false` |
| inline in `.devin-plugin/plugin.json` | Devin | `${SPICRAWL_AUTHORIZATION}` as the whole header value |
| inline in `gemini-extension.json` | Gemini CLI | `$SPICRAWL_MCP_BEARER` from the extension `settings` |

Notes:

- No file is named `.mcp.json`. It is Claude Code's default name, but Copilot CLI also reads it by
  default and Droid translates it, and neither expands `${user_config...}`.
- Cursor's manifest points at `mcp/cursor.json` so its default `mcp.json` discovery does not pick
  up the Droid file.
- The Gemini variable name must not contain `KEY`, `TOKEN`, `SECRET`, `PASSWORD`, `AUTH`,
  `CREDENTIAL`, `CERT` or `PRIVATE`: Gemini CLI removes such variables from the environment before
  it expands header values.
- There is no root `plugin.json` in `plugins/spicrawl`. The Agent Plugins standard
  (agent-plugins.org) has a closed `mcp.json` schema and does not expand variables in remote
  server headers, so a portable package cannot carry a bearer key. Codex and Copilot CLI prefer a
  root `plugin.json` over their own manifests, so adding one would drop the key from both. The
  `skills/` layout follows the standard.
- `plugins/spicrawl/.github/plugin/plugin.json` gives Copilot CLI a manifest without an MCP
  server. Without it Copilot CLI would read the Claude manifest and send the literal header.
- Manifests list only what the server offers today.
- Coming soon, so absent from every manifest and skill step: AI extraction, stealth mode, the managed proxy pool, and the remote browser (`spicrawl_browser_connect_url`).
- After changing a manifest: `claude plugin validate --strict plugins/spicrawl` and
  `claude plugin validate --strict .`.
- The repository topic `gemini-cli-extension` must be set for the Gemini gallery to list it.

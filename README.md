# Spicrawl agent plugins

Spicrawl's plugin for coding agents, in one repository. It connects an agent to the hosted
Spicrawl MCP server and, in the tools that support it, gives the agent a skill that explains how
to use it.

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
| OpenCode | npm plugin `opencode-spicrawl` (adds the MCP server) |
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

Install the `spicrawl` plugin, then give it your key: in Cursor open Plugins, Configure on
Spicrawl, and set `SPICRAWL_API_KEY`. The plugin declares it as a required variable, and Cursor
substitutes it into the `Authorization` header of the MCP server. It is a plugin variable that you
set in Cursor, not a shell environment variable.

Until the plugin is listed in the Cursor marketplace, copy `plugins/spicrawl` to
`~/.cursor/plugins/local/spicrawl` and restart Cursor.

To skip the plugin and add only the server, put this in `~/.cursor/mcp.json`. Here the key does
come from the environment Cursor is started from, so export it first:

```sh
export SPICRAWL_API_KEY=spicrawl_live_...
```

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

### OpenCode

```sh
export SPICRAWL_API_KEY=spicrawl_live_...
```

Then add the plugin to `opencode.json` (project) or `~/.config/opencode/opencode.json` (global):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["opencode-spicrawl"]
}
```

The plugin (source in [`opencode/`](opencode), on npm as
[`opencode-spicrawl`](https://www.npmjs.com/package/opencode-spicrawl)) adds the Spicrawl remote
MCP server to OpenCode's config in memory, with OAuth off and the key from `SPICRAWL_API_KEY` as
the bearer token. It writes nothing to your config files. Without the key it adds nothing and logs
a warning. A `mcp.spicrawl` entry that you write by hand wins over the plugin. It installs no
skill. Check the connection with `opencode mcp list`.

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
Nothing here contains a key. The plugins for Claude Code, Codex, Cursor, Factory Droid, Devin,
Gemini CLI and Copilot CLI run no code of their own: they are JSON manifests, a skill file
(Markdown) and a logo. The OpenCode plugin is a small JavaScript package (`opencode/`) that reads
`SPICRAWL_API_KEY` and hands it to OpenCode as the MCP header; it makes no network requests
itself. Each tool reads the key from where its format allows: a sensitive plugin setting (Claude
Code, Gemini CLI), a plugin variable you set in Cursor, an environment variable (Codex, Factory
Droid, OpenCode), a credential you enter in Devin, or the command you type (Copilot CLI, any MCP
client).

The pages an agent asks Spicrawl to scrape, and the results, go through the same server.

## Docs and contact

- MCP server docs: <https://docs.spicrawl.com/agents/mcp>
- Website: <https://spicrawl.com>
- SDK: <https://github.com/Spicrawl/sdk>, CLI: <https://github.com/Spicrawl/cli> (Apache-2.0)
- Contact: dev@spicrawl.com

Licensed under the Apache License 2.0. See [LICENSE](LICENSE).

## Maintainer notes

There is one skill and one logo, shared by every tool that uses them:

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
| `mcp/cursor.json` | Cursor (`mcpServers` in `.cursor-plugin/plugin.json`) | `${SPICRAWL_API_KEY}`, from `variables` in `.cursor-plugin/plugin.json`; the user sets it under Plugins, Configure |
| `mcp.json` | Factory Droid (fixed root path) | `${SPICRAWL_AUTH}` as the whole header value, `oauth: false` |
| inline in `.devin-plugin/plugin.json` | Devin | `${SPICRAWL_AUTHORIZATION}` as the whole header value |
| inline in `gemini-extension.json` | Gemini CLI | `$SPICRAWL_MCP_BEARER` from the extension `settings` |
| `opencode/index.js` (npm `opencode-spicrawl`) | OpenCode | `Bearer <value of SPICRAWL_API_KEY>`, built in code |

Notes:

- No file is named `.mcp.json`. It is Claude Code's default name, but Copilot CLI also reads it by
  default and Droid translates it, and neither expands `${user_config...}`.
- Cursor's manifest points at `mcp/cursor.json` so its default `mcp.json` discovery does not pick
  up the Droid file. Every `${VAR}` in that file must be declared under `variables` in the
  manifest, and Cursor does not read it from the shell: `${env:...}` is valid only in the user's
  own `~/.cursor/mcp.json`.
- `opencode/` is the source of the npm package `opencode-spicrawl` (OpenCode has no plugin
  marketplace format). It has its own `package.json` version and is published to npm separately
  from these manifests, so its version does not have to match `0.1.0`.
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

## Releasing

The OpenCode plugin (`opencode/`, npm `opencode-spicrawl`) is released by `.github/workflows/release-opencode.yml`.

1. Bump `version` in `opencode/package.json` and add a `## X.Y.Z (YYYY-MM-DD)` section to `opencode/CHANGELOG.md`.
2. Merge to `main`. CI runs `npm ci`, the typecheck and the tests. If npm does not have that version yet, it publishes with provenance and creates a GitHub release tagged `opencode-spicrawl-vX.Y.Z` whose notes are that CHANGELOG section. A version containing `-` (for example `0.2.0-beta.1`) is published under the `next` dist-tag and marked as a prerelease.
3. The `NPM_TOKEN` repository secret is a granular npm token for the `spicrawl` account with publish rights and 2FA bypass. It lasts at most 90 days, so rotate it before then. Move to OIDC trusted publishing before January 2027, when npm ends direct token publishing.

The other tools install straight from this repository, so they need no release step: a change is live once it is on `main`.

The `validate` workflow runs on every push and pull request. It parses all JSON files, runs the OpenCode tests, and fails if any file contains something matching `spicrawl_(live|test)_[a-z0-9]{20,}`.

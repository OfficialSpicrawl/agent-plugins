# Changelog

## 0.2.3 / Coordinated release (2026-11-05)

### New release automation

- Added `.github/workflows/release-all-on-merge.yml`: merging a version-bumping PR to `main` now automatically releases every plugin format.
- Added per-format release workflows for OpenAI, Cursor, Claude, Factory, Devin, Copilot, Gemini, and OpenBot.
- Added a unified `v*` release workflow that attaches every artifact to a single GitHub release page.

### OpenAI plugin mobile/web fix

- Added `plugins/spicrawl-openai/.app.json` with a registered ChatGPT app mapping.
- Updated `plugins/spicrawl-openai/plugin.json` to declare `"apps": "./.app.json"`.
- This removes the ChatGPT Desktop-only restriction and makes the plugin available on mobile and web.

### Version bumps

- Shared collection version: `0.2.2` → `0.2.3` in:
  - `plugins/spicrawl-openai/plugin.json`
  - `plugins/spicrawl/.claude-plugin/plugin.json`
  - `plugins/spicrawl/.cursor-plugin/plugin.json`
  - `plugins/spicrawl/.factory-plugin/plugin.json`
  - `plugins/spicrawl/.github/plugin/plugin.json`
  - `gemini-extension.json`
- Dify plugin: `0.1.5` → `0.1.6`
- OpenCode plugin: `0.1.1` → `0.1.2`
- OpenBot plugin: `1.0.0` → `1.0.1`

### Documentation

- Added release and changelog sections to every plugin README.
- Updated the repository README with the new auto-release behavior and version references.

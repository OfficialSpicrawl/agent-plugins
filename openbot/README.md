# OpenBot plugin

This folder holds the source manifest for adding Spicrawl to OpenBot's Marketplace plugin catalog.

The actual plugin catalog lives in the [OpenBot repository](https://github.com/nightly-labs/openbot)
under `marketplace/plugin-catalog/`. To list Spicrawl in OpenBot:

1. Copy `plugin.json` into a new folder:
   `marketplace/plugin-catalog/plugins/spicrawl/plugin.json`
2. Add `"spicrawl"` to the `order` array in `marketplace/plugin-catalog/catalog.json` and update
   `updatedAt`.
3. Run OpenBot's catalog build:
   ```sh
   bun run marketplace:build:plugins
   bun run marketplace:build:plugins -- --check
   ```
4. For the `http` server, also run the manual smoke test:
   ```sh
   bun run test:mcp-catalog
   ```

This plugin uses Spicrawl's hosted streamable HTTP MCP server at `https://mcp.spicrawl.com/mcp` and
asks the user for a Spicrawl API key, which is sent as `Authorization: Bearer <key>`.

## Releases

Download `spicrawl-openbot-<version>.zip` from the [GitHub releases page](https://github.com/OfficialSpicrawl/agent-plugins/releases). The ZIP contains `plugin.json` and this README.

To update the OpenBot catalog:
1. Extract `plugin.json` from the ZIP.
2. Copy it into `marketplace/plugin-catalog/plugins/spicrawl/plugin.json` in the OpenBot repository.
3. Update `updatedAt` and rebuild the catalog.

### Recent versions

| Version | What changed |
|---|---|
| 1.0.1 | Added automated GitHub releases as part of the coordinated plugin release pipeline. |
| 1.0.0 | Initial OpenBot marketplace manifest. |

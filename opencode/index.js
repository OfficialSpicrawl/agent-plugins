// opencode-spicrawl: adds the Spicrawl remote MCP server to OpenCode.
//
// OpenCode calls the `config` hook with the resolved config before it starts
// MCP servers, so the plugin only has to add an `mcp.spicrawl` entry.

const MCP_URL = "https://mcp.spicrawl.com/mcp"
const KEY_ENV = "SPICRAWL_API_KEY"

/** @type {import("@opencode-ai/plugin").Plugin} */
export const SpicrawlPlugin = async ({ client }) => {
  return {
    async config(config) {
      config.mcp ??= {}

      // A server the user configured by hand always wins.
      if (config.mcp.spicrawl) return

      const key = process.env[KEY_ENV]?.trim()
      if (!key) {
        // No key: register nothing, so there is no failing MCP connection.
        await client.app
          .log({
            body: {
              service: "opencode-spicrawl",
              level: "warn",
              message: `${KEY_ENV} is not set; the Spicrawl MCP server was not added. Create a key at https://app.spicrawl.com.`,
            },
          })
          .catch(() => {})
        return
      }

      config.mcp.spicrawl = {
        type: "remote",
        url: MCP_URL,
        oauth: false,
        enabled: true,
        headers: { Authorization: `Bearer ${key}` },
      }
    },
  }
}

export default { id: "opencode-spicrawl", server: SpicrawlPlugin }

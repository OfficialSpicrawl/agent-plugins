import { test } from "node:test"
import assert from "node:assert/strict"
import plugin from "../index.js"

const logs = []
const client = { app: { log: async (o) => logs.push(o.body) } }

async function run(config, key) {
  const prev = process.env.SPICRAWL_API_KEY
  if (key === undefined) delete process.env.SPICRAWL_API_KEY
  else process.env.SPICRAWL_API_KEY = key
  try {
    const hooks = await plugin.server({ client })
    await hooks.config(config)
  } finally {
    if (prev === undefined) delete process.env.SPICRAWL_API_KEY
    else process.env.SPICRAWL_API_KEY = prev
  }
  return config
}

test("has a stable id", () => {
  assert.equal(plugin.id, "opencode-spicrawl")
})

test("adds the remote MCP server with the key", async () => {
  const c = await run({}, "spicrawl_live_test")
  assert.deepEqual(c.mcp.spicrawl, {
    type: "remote",
    url: "https://mcp.spicrawl.com/mcp",
    oauth: false,
    enabled: true,
    headers: { Authorization: "Bearer spicrawl_live_test" },
  })
})

test("keeps other MCP servers", async () => {
  const other = { type: "local", command: ["x"] }
  const c = await run({ mcp: { other } }, "k")
  assert.equal(c.mcp.other, other)
  assert.ok(c.mcp.spicrawl)
})

test("adds nothing and warns when the key is missing or blank", async () => {
  for (const key of [undefined, "", "  "]) {
    logs.length = 0
    const c = await run({}, key)
    assert.equal(c.mcp.spicrawl, undefined)
    assert.equal(logs.length, 1)
    assert.equal(logs[0].level, "warn")
  }
})

test("never overrides a hand-written spicrawl entry", async () => {
  const mine = { type: "remote", url: "https://example.test/mcp" }
  const c = await run({ mcp: { spicrawl: mine } }, "k")
  assert.equal(c.mcp.spicrawl, mine)
})

test("survives a log failure", async () => {
  const hooks = await plugin.server({ client: { app: { log: () => Promise.reject(new Error("x")) } } })
  delete process.env.SPICRAWL_API_KEY
  await hooks.config({})
})

# n8n-nodes-spicrawl

This is an n8n community node. It lets you use [Spicrawl](https://spicrawl.com) in your n8n workflows.

Spicrawl is a web scraping API. It fetches any URL and returns it as clean markdown, HTML, text, a PDF or structured JSON. It renders JavaScript when a page needs it, and runs large URL lists as batch jobs.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Usage](#usage)
[Examples](#examples)
[Troubleshooting](#troubleshooting)
[Compatibility](#compatibility)
[Resources](#resources)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation, and install the package `n8n-nodes-spicrawl`.

## Operations

The **Spicrawl** node has two operations.

| Operation | What it does |
|---|---|
| **Scrape URL** | Fetches one page and returns it as markdown, HTML, text, a PDF (binary) or a JSON envelope. Can also extract fields with CSS selectors, return page metadata and links, and capture a screenshot (binary). |
| **Batch Scrape** | Submits a list of URLs as one job, waits for it to finish, then returns one output item per URL. Takes the URLs from a text list or from the input items. |

The node is marked as usable as a tool, so an **AI Agent** node can call both operations.

### Rendering tiers

Every page is loaded by the cheapest tier that can do what you asked for.

| Tier | Choose it with | Use it for |
|---|---|---|
| `fetch` | Rendering: Fetch (default) | Static pages and server-rendered HTML. Plain HTTP, no JavaScript. |
| `js` | Rendering: JavaScript | Pages whose content is built by JavaScript. Needed for Wait For Selector, Wait After Load and Block Resources. |
| `browser` | Chosen for you | Screenshots and PDFs. Costs the most. |

**Rendering: Auto** (Scrape URL only) starts with `fetch` and escalates to `js` only if the page needs it. You pay for the tier that worked. See [Credits](https://docs.spicrawl.com/credits) for current prices. A request that fails costs nothing.

### Scrape URL parameters

| Parameter | API field | Notes |
|---|---|---|
| URL | `url` | Required. `http://` or `https://`. |
| Response Format | `response_format` | Markdown (default), HTML, Text, JSON Envelope, PDF. |
| Rendering | `js_render`, `mode` | Fetch, JavaScript or Auto. |
| Simplify | | On by default. Returns the 10 most useful fields. Turn it off for the complete response. |

Options:

| Option | API field | Notes |
|---|---|---|
| Auto-Parse Page Metadata | `autoparse` | JSON-LD, OpenGraph, Twitter Card, microdata. Returned under `data`. |
| Block Resources | `block_resources` | Image, Font, Media, Script, Stylesheet. Needs JavaScript or Auto. |
| Bypass Cache | `cache` | Sends `cache: false`. A cache hit is billed like the fetch that stored it. |
| Cache TTL (Seconds) | `cache_ttl` | Cannot be combined with Bypass Cache. |
| Custom Headers | `custom_headers` | Sent to the target site. |
| Extract Fields (JSON) | `extract` | A map of field name to CSS selector, or a JSON Schema with selectors. Returned under `data`. |
| Main Content Only | `main_content_only` | Strips navigation, footers and sidebars. |
| Max Cost (Credits) | `max_cost` | Refuses the request, free of charge, if it could cost more. |
| Proxy URL | `proxy` | Your own proxy. Residential proxies work best on protected sites. |
| Return Links | `links` | All absolute links on the page, under `links`. |
| Screenshot, Screenshot Format, Screenshot Full Page | `screenshot`, `screenshot_format`, `screenshot_fullpage` | The image is returned as binary data in the `screenshot` property. |
| Wait After Load (Ms) | `wait` | Needs JavaScript or Auto. |
| Wait For Selector | `wait_for` | CSS selector. Needs JavaScript or Auto. |

### Batch Scrape parameters

| Parameter | API field | Notes |
|---|---|---|
| URL Source | | Text List (one URL per line) or Input Items (one URL from each input item, default expression `{{ $json.url }}`). Up to 10,000 URLs. |
| Response Format | `response_format` | Markdown (default), HTML or Text. |
| Rendering | `js_render` | Fetch or JavaScript. |
| Simplify | | On by default. |

Options: Block Resources, Concurrency, Credit Budget, Custom Headers, Failure Threshold, Job Name, Main Content Only, Max Attempts, Max Cost Per Page (Credits), Max Wait (Minutes), Poll Interval (Seconds), Proxy URL, Wait After Load (Ms), Wait For Selector.

Batch jobs run each URL as one fetch or one render. Extraction, screenshots, PDFs, actions, Auto rendering and the result cache are not available in a batch; the API refuses them with a `400` that names each offending field, and nothing is charged. Use Scrape URL for those.

Batch Scrape runs once for all input items, not once per item. The job is polled until it finishes (or Max Wait is reached), then every finished page is returned.

## Credentials

You need a Spicrawl account and an API key.

1. Sign in at [app.spicrawl.com](https://app.spicrawl.com) and open **API Keys**.
2. Create a key. Live keys start with `spicrawl_live_` and spend credits. Test keys start with `spicrawl_test_`.
3. Give the key the `scrape` scope for Scrape URL and the `batch` scope for Batch Scrape.
4. In n8n, create a **Spicrawl API** credential and paste the key into **API Key**.

n8n tests the credential by listing your recent requests, which works with any valid key. See [Authentication](https://docs.spicrawl.com/authentication).

## Usage

### Output of Scrape URL

With **Simplify** on you get these fields, when they apply:

| Field | Meaning |
|---|---|
| `url`, `final_url` | The URL you asked for and the URL after redirects. |
| `status` | The status the target site answered with. A blocked or missing page is still a successful call: check `status`. |
| `content` | The page in the chosen format. |
| `credits` | Credits charged for this request. |
| `warnings` | Advisories from the API, for example that the format was changed to JSON. |
| `data`, `empty_fields` | Extracted fields. `empty_fields` lists selectors that matched nothing, which is the first sign a site changed. |
| `links` | Links found on the page. |
| `request_id` | Quote it to Spicrawl support. |

Turn Simplify off to also get `engine` (the tier that served the page), `credits_remaining`, `cache_state`, `proxy_source` and the rest of the JSON envelope. PDFs and screenshots always arrive as binary data, whatever Simplify is set to.

### Output of Batch Scrape

One item per finished URL, in submission order:

| Field | Meaning |
|---|---|
| `seq` | Position of the URL in the job, starting at 0. With Input Items it is the index of the input item. |
| `url` | The URL as submitted. |
| `status` | `succeeded`, `failed`, `cancelled` or `skipped`. |
| `http_status` | The status the target site answered with. |
| `content` | The page in the chosen format. |
| `content_state` | Present only when `content` is missing: `truncated` (over 512 KiB), `omitted` or `unavailable`. |
| `credits` | Credits charged for this URL. Only succeeded pages are charged. |
| `error` | `code` and `retryable` for a failed URL. |
| `batch_id`, `batch_status` | The job, and how it ended (`completed`, `failed` or `cancelled`). |

Failed URLs are returned too, so filter on `status` with an **IF** or **Filter** node. If nothing finished, the node returns the job itself so you can see why.

Batch results stay readable for 72 hours. If the job does not finish within **Max Wait**, the node stops with an error that names the job ID; the job keeps running and finished pages are still charged.

### Notes

- Scraping is not idempotent: every call is charged, including cache hits. Use n8n's **Retry On Fail** for errors marked retryable, not for successful calls.
- Errors from the API are shown with their stable code, for example `ERR::AUTH::INSUFFICIENT_SCOPE`, plus the API's hint and the request ID.
- Use the markdown format when the output goes to an AI model: it is much smaller than HTML.

## Examples

Import an example with **Workflow menu > Import from URL or clipboard**. Select your credential on the Spicrawl node afterwards.

### Scrape a page to markdown

```json
{
  "nodes": [
    {
      "name": "When clicking Test workflow",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [0, 0],
      "parameters": {}
    },
    {
      "name": "Spicrawl",
      "type": "n8n-nodes-spicrawl.spicrawl",
      "typeVersion": 1,
      "position": [220, 0],
      "parameters": {
        "operation": "scrape",
        "url": "https://example.com",
        "responseFormat": "markdown",
        "rendering": "fetch",
        "simplify": true,
        "options": {}
      }
    }
  ],
  "connections": {
    "When clicking Test workflow": {
      "main": [[{ "node": "Spicrawl", "type": "main", "index": 0 }]]
    }
  }
}
```

### Extract product fields from a JavaScript page

Set Rendering to JavaScript, then add the options Wait For Selector (`.price`) and Extract Fields (JSON):

```json
{
  "title": "h1",
  "price": ".price",
  "images": { "selector": ".gallery img", "kind": "list", "output": "attr", "attribute": "src" },
  "next_page": "a.next@href"
}
```

The fields come back under `data`:

```json
{
  "url": "https://example.com/products/42",
  "status": 200,
  "credits": 3,
  "data": { "title": "Walnut Desk", "price": "$349.00", "images": ["https://example.com/img/desk-1.jpg"] },
  "empty_fields": ["next_page"]
}
```

### Take a screenshot

Add the options Screenshot and Screenshot Full Page. The image arrives in the binary property `screenshot`, ready for a **Write Binary File**, **Google Drive** or **Send Email** node. The call uses the `browser` tier.

### Batch scrape a list of URLs

```json
{
  "nodes": [
    {
      "name": "When clicking Test workflow",
      "type": "n8n-nodes-base.manualTrigger",
      "typeVersion": 1,
      "position": [0, 0],
      "parameters": {}
    },
    {
      "name": "Spicrawl",
      "type": "n8n-nodes-spicrawl.spicrawl",
      "typeVersion": 1,
      "position": [220, 0],
      "parameters": {
        "operation": "batch",
        "urlSource": "list",
        "urls": "https://example.com/products/1\nhttps://example.com/products/2",
        "responseFormat": "markdown",
        "rendering": "js",
        "simplify": true,
        "batchOptions": { "jobName": "nightly-catalog", "concurrency": 20 }
      }
    }
  ],
  "connections": {
    "When clicking Test workflow": {
      "main": [[{ "node": "Spicrawl", "type": "main", "index": 0 }]]
    }
  }
}
```

To scrape URLs that come from a previous node (a Google Sheet, an RSS feed, a database), set URL Source to Input Items and point URL at the field, for example `{{ $json.link }}`.

### Give an AI agent a web page reader

Add a Spicrawl node to an **AI Agent** node's tools. The agent fills in the URL and picks the options it needs. Keep Response Format on Markdown, and set **Max Cost (Credits)** so one tool call can never spend more than you intend.

## Troubleshooting

| Error code | What it means | What to do |
|---|---|---|
| `ERR::AUTH::INVALID_KEY`, `ERR::AUTH::MISSING_KEY` | The key is wrong or empty. | Copy the key again into the credential. |
| `ERR::AUTH::INSUFFICIENT_SCOPE` | The key lacks the scope for this operation. | Use a key with `scrape` (Scrape URL) or `batch` (Batch Scrape). |
| `ERR::REQUEST::INCOMPATIBLE_FLAGS` | An option needs another one, for example Wait For Selector needs JavaScript or Auto rendering. | Change Rendering. |
| `ERR::LIMIT::QUOTA_EXCEEDED` | The monthly credit allowance cannot cover the request. | Submit fewer URLs, set Max Cost, or add credits. |
| `ERR::LIMIT::RATE_LIMITED`, `ERR::LIMIT::CONCURRENCY_EXCEEDED` (HTTP 429) | Too many requests per second, or too many in flight. Both are retryable and free. | Enable Retry On Fail on the node, or use Batch Scrape. |

The full list is in the [error catalogue](https://docs.spicrawl.com/errors).

## Compatibility

Developed against n8n 2.x with `n8n-workflow` 2.42 (`n8nNodesApiVersion` 1). The package has no runtime dependencies.

## Resources

- [Source code](https://github.com/OfficialSpicrawl/agent-plugins/tree/main/n8n), in the [agent-plugins](https://github.com/OfficialSpicrawl/agent-plugins) repository
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Spicrawl documentation](https://docs.spicrawl.com)
- [Scrape API reference](https://docs.spicrawl.com/api-reference/introduction)
- [Batch jobs guide](https://docs.spicrawl.com/guides/batch)
- [Structured data extraction guide](https://docs.spicrawl.com/guides/structured-data)

## Version history

See [CHANGELOG.md](CHANGELOG.md).

- **0.1.0**: Scrape URL and Batch Scrape.

## License

[MIT](LICENSE.md)

# Privacy Policy: Spicrawl plugin for Dify

Last updated: 12 October 2026

This plugin connects Dify to the [Spicrawl](https://spicrawl.com) web scraping API. The plugin itself has no server, database or analytics. It does not store, log or forward anything to anyone other than the Spicrawl API.

## What the plugin sends

When a workflow or agent runs a Spicrawl tool, the plugin sends one HTTPS request to `https://api.spicrawl.com` containing:

- Your Spicrawl API key, in the `Authorization` header.
- The URL(s) you ask it to fetch, and the options you set: output format, JavaScript rendering, wait selector, include and exclude selectors, extraction rules (field names and CSS selectors), and a batch job ID.
- If you fill in the optional Proxy URL field, that proxy URL, including any username and password in it. Spicrawl uses it to route that request and nothing else.

The plugin does not send your Dify account details, workspace, conversation text, prompts, uploaded files or model output. Only the values above leave Dify, and only when a Spicrawl tool is run.

## What the plugin receives and returns

Spicrawl returns the fetched page in the format you chose, plus metadata (the site's HTTP status, credits charged, request ID). The plugin passes this to your workflow as the tool output. It keeps nothing after the call returns.

## Storage

- **API key:** stored by Dify as an encrypted credential. The plugin reads it only to authenticate calls and never writes it to logs, errors or tool output.
- **Proxy URL:** a tool input. It is held in memory for the duration of the call and is not persisted by the plugin. Dify stores the values you save in a workflow node according to its own policy.
- **Plugin storage:** the plugin does not use Dify's plugin storage and does not request model, app or storage permissions.

## What Spicrawl does with the data

Spicrawl is a third-party service and processes the requests above to fetch pages on your behalf. According to the [Spicrawl Privacy Policy](https://spicrawl.com/privacy):

- Request records (the URLs you ask for, result status, timing, credits used, and which API key was used) are kept for a limited period and are visible in your Spicrawl dashboard logs.
- Cached pages are kept for up to 48 hours, and batch job results expire after 72 hours.
- Spicrawl does not sell personal data.

The pages you scrape are fetched from the sites you name. The plugin does not collect personal data about you or the people whose pages you fetch. Do not use it to collect personal data you have no right to process.

Spicrawl's terms are at [spicrawl.com/terms](https://spicrawl.com/terms).

## Third parties

The only third party the plugin contacts is Spicrawl (`api.spicrawl.com`). Spicrawl in turn contacts the target sites you specify, and your proxy if you set one.

## Retention and deletion

The plugin retains nothing. To delete data held by Spicrawl, or to revoke access, revoke the API key in the Spicrawl dashboard or email support@spicrawl.com.

## Contact

Privacy questions: support@spicrawl.com

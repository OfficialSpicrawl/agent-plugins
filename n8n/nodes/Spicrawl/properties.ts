import type { INodeProperties } from 'n8n-workflow';

const scrapeOnly = { show: { operation: ['scrape'] } };
const batchOnly = { show: { operation: ['batch'] } };

// Options shared by Scrape URL and Batch Scrape (same API field, same meaning).
const blockResources: INodeProperties = {
	displayName: 'Block Resources',
	name: 'blockResources',
	type: 'multiOptions',
	options: [
		{ name: 'Font', value: 'font' },
		{ name: 'Image', value: 'image' },
		{ name: 'Media', value: 'media' },
		{ name: 'Script', value: 'script' },
		{ name: 'Stylesheet', value: 'stylesheet' },
	],
	default: [],
	description:
		'Resource types the page must not load while rendering. Needs the JavaScript or Auto rendering tier.',
};

const customHeaders: INodeProperties = {
	displayName: 'Custom Headers',
	name: 'customHeaders',
	type: 'fixedCollection',
	typeOptions: { multipleValues: true },
	placeholder: 'Add Header',
	default: {},
	description: 'Extra headers sent to the target site',
	options: [
		{
			displayName: 'Header',
			name: 'header',
			values: [
				{
					displayName: 'Name',
					name: 'name',
					type: 'string',
					default: '',
					placeholder: 'e.g. Accept-Language',
				},
				{
					displayName: 'Value',
					name: 'value',
					type: 'string',
					default: '',
					placeholder: 'e.g. en-US',
				},
			],
		},
	],
};

const mainContentOnly: INodeProperties = {
	displayName: 'Main Content Only',
	name: 'mainContentOnly',
	type: 'boolean',
	default: true,
	description:
		'Whether to strip navigation, footers and sidebars so only the main article remains. Applies to markdown and text output.',
};

const maxCost: INodeProperties = {
	displayName: 'Max Cost (Credits)',
	name: 'maxCost',
	type: 'number',
	typeOptions: { minValue: 1 },
	default: 10,
	description:
		'Refuse the request, at no charge, if its most expensive possible outcome costs more than this many credits',
};

const proxy: INodeProperties = {
	displayName: 'Proxy URL',
	name: 'proxy',
	type: 'string',
	typeOptions: { password: true },
	default: '',
	placeholder: 'e.g. http://user:pass@proxy.example.com:8080',
	description:
		'Your own proxy (http, https, socks5 or socks5h). Residential proxies work best on protected sites.',
};

const waitMs: INodeProperties = {
	displayName: 'Wait After Load (Ms)',
	name: 'waitMs',
	type: 'number',
	typeOptions: { minValue: 1, maxValue: 30000 },
	default: 1000,
	description:
		'Milliseconds to wait after the page loads before capturing it. Needs the JavaScript or Auto rendering tier.',
};

const waitFor: INodeProperties = {
	displayName: 'Wait For Selector',
	name: 'waitFor',
	type: 'string',
	default: '',
	placeholder: 'e.g. .product-price',
	description:
		'CSS selector that must appear before the page is captured. Needs the JavaScript or Auto rendering tier.',
};

export const properties: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		default: 'scrape',
		options: [
			{
				name: 'Scrape URL',
				value: 'scrape',
				action: 'Scrape page',
				description: 'Fetch one page and return it as markdown, HTML, text, PDF or structured data',
			},
			{
				name: 'Batch Scrape',
				value: 'batch',
				action: 'Batch scrape pages',
				description: 'Scrape many pages in one job, wait for it to finish and return every result',
			},
		],
	},

	// ---------- Scrape URL ----------
	{
		displayName: 'URL',
		name: 'url',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/products/42',
		description: 'The page to scrape. Must start with http:// or https://.',
		displayOptions: scrapeOnly,
	},
	{
		displayName: 'Response Format',
		name: 'responseFormat',
		type: 'options',
		default: 'markdown',
		description: 'What the node returns for the page',
		displayOptions: scrapeOnly,
		options: [
			{ name: 'HTML', value: 'html', description: 'The page HTML' },
			{
				name: 'JSON Envelope',
				value: 'json',
				description: 'Structured JSON with the content, final URL, target status and metadata',
			},
			{
				name: 'Markdown',
				value: 'markdown',
				description: 'Clean markdown, the best input for AI models',
			},
			{
				name: 'PDF',
				value: 'pdf',
				description: 'A PDF of the rendered page, returned as binary data (browser tier)',
			},
			{ name: 'Text', value: 'text', description: 'Plain text without markup' },
		],
	},
	{
		displayName: 'Rendering',
		name: 'rendering',
		type: 'options',
		default: 'fetch',
		description:
			'How the page is loaded. Screenshots and PDFs always use the browser tier, which costs more.',
		displayOptions: scrapeOnly,
		options: [
			{
				name: 'Auto',
				value: 'auto',
				description:
					'Try fetch first and escalate to JavaScript only if needed. You pay only for the tier that worked.',
			},
			{
				name: 'Fetch',
				value: 'fetch',
				description: 'Plain HTTP request with no JavaScript. The fastest and cheapest tier.',
			},
			{
				name: 'JavaScript',
				value: 'js',
				description: 'Run the live page JavaScript before capture, for client-rendered pages',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: scrapeOnly,
		options: [
			{
				displayName: 'Auto-Parse Page Metadata',
				name: 'autoparse',
				type: 'boolean',
				default: true,
				description:
					'Whether to also return the metadata the page publishes about itself (JSON-LD, OpenGraph, Twitter Card, microdata) under "data"',
			},
			blockResources,
			{
				displayName: 'Bypass Cache',
				name: 'bypassCache',
				type: 'boolean',
				default: true,
				description:
					'Whether to skip stored results and fetch the page again. Use for time-sensitive data. A cache hit is billed at the same price as the fetch that stored it.',
			},
			{
				displayName: 'Cache TTL (Seconds)',
				name: 'cacheTtl',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 3600,
				description:
					'Maximum age of a cached result to accept. Cannot be combined with "Bypass Cache".',
			},
			customHeaders,
			{
				displayName: 'Extract Fields (JSON)',
				name: 'extract',
				type: 'json',
				default: '{\n  "title": "h1",\n  "price": ".price"\n}',
				description:
					'Structured extraction. Either a map of field name to CSS selector (use "a.next@href" for an attribute), or a JSON Schema whose properties each have a "selector". The result is returned under "data".',
			},
			mainContentOnly,
			maxCost,
			proxy,
			{
				displayName: 'Return Links',
				name: 'links',
				type: 'boolean',
				default: true,
				description: 'Whether to return every absolute link found on the page under "links"',
			},
			{
				displayName: 'Screenshot',
				name: 'screenshot',
				type: 'boolean',
				default: true,
				description:
					'Whether to capture a screenshot. It is returned as binary data (property "screenshot") and uses the browser tier.',
			},
			{
				displayName: 'Screenshot Format',
				name: 'screenshotFormat',
				type: 'options',
				options: [
					{ name: 'JPEG', value: 'jpeg' },
					{ name: 'PNG', value: 'png' },
					{ name: 'WebP', value: 'webp' },
				],
				default: 'png',
				description: 'Image format of the screenshot. Needs "Screenshot".',
			},
			{
				displayName: 'Screenshot Full Page',
				name: 'screenshotFullPage',
				type: 'boolean',
				default: true,
				description: 'Whether to capture the whole scrollable page. Needs "Screenshot".',
			},
			waitMs,
			waitFor,
		],
	},

	// ---------- Batch Scrape ----------
	{
		displayName: 'URL Source',
		name: 'urlSource',
		type: 'options',
		default: 'list',
		description: 'Where the URLs to scrape come from',
		displayOptions: batchOnly,
		options: [
			{
				name: 'Input Items',
				value: 'items',
				description: 'One URL from each input item',
			},
			{
				name: 'Text List',
				value: 'list',
				description: 'A list typed or built with an expression, one URL per line',
			},
		],
	},
	{
		displayName: 'URLs',
		name: 'urls',
		type: 'string',
		typeOptions: { rows: 6 },
		required: true,
		default: '',
		placeholder: 'e.g. https://example.com/products/1\nhttps://example.com/products/2',
		description: 'The pages to scrape, one URL per line. Up to 10,000.',
		displayOptions: { show: { operation: ['batch'], urlSource: ['list'] } },
	},
	{
		displayName: 'URL',
		name: 'itemUrl',
		type: 'string',
		required: true,
		default: '={{ $json.url }}',
		description: 'The URL to scrape for each input item',
		displayOptions: { show: { operation: ['batch'], urlSource: ['items'] } },
	},
	{
		displayName: 'Response Format',
		name: 'responseFormat',
		type: 'options',
		default: 'markdown',
		description: 'What the node returns for each page',
		displayOptions: batchOnly,
		options: [
			{ name: 'HTML', value: 'html', description: 'The page HTML' },
			{
				name: 'Markdown',
				value: 'markdown',
				description: 'Clean markdown, the best input for AI models',
			},
			{ name: 'Text', value: 'text', description: 'Plain text without markup' },
		],
	},
	{
		displayName: 'Rendering',
		name: 'rendering',
		type: 'options',
		default: 'fetch',
		description: 'How each page is loaded',
		displayOptions: batchOnly,
		options: [
			{
				name: 'Fetch',
				value: 'fetch',
				description: 'Plain HTTP request with no JavaScript. The fastest and cheapest tier.',
			},
			{
				name: 'JavaScript',
				value: 'js',
				description: 'Run the live page JavaScript before capture, for client-rendered pages',
			},
		],
	},
	{
		displayName: 'Options',
		name: 'batchOptions',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: batchOnly,
		options: [
			blockResources,
			{
				displayName: 'Concurrency',
				name: 'concurrency',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 50 },
				default: 10,
				description: 'How many pages of this job are fetched at the same time',
			},
			{
				displayName: 'Credit Budget',
				name: 'creditBudget',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 100,
				description:
					'Ceiling on the credits the whole job may spend. Pages beyond it are skipped, not charged.',
			},
			customHeaders,
			{
				displayName: 'Failure Threshold',
				name: 'failureThreshold',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Stop the job once this many pages have failed',
			},
			{
				displayName: 'Job Name',
				name: 'jobName',
				type: 'string',
				default: '',
				placeholder: 'e.g. nightly-catalog',
				description: 'A label shown on the job in the Spicrawl dashboard',
			},
			mainContentOnly,
			{
				displayName: 'Max Attempts',
				name: 'maxAttempts',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 10 },
				default: 3,
				description: 'How many times a page is tried before it is marked failed',
			},
			{ ...maxCost, displayName: 'Max Cost Per Page (Credits)' },
			{
				displayName: 'Max Wait (Minutes)',
				name: 'maxWait',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 30,
				description:
					'Give up waiting after this long. The job keeps running and its results stay readable for 72 hours.',
			},
			{
				displayName: 'Poll Interval (Seconds)',
				name: 'pollInterval',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 5,
				description: 'How often to check whether the job has finished',
			},
			proxy,
			waitMs,
			waitFor,
		],
	},

	// ---------- Both ----------
	{
		displayName: 'Simplify',
		name: 'simplify',
		type: 'boolean',
		default: true,
		description: 'Whether to return a simplified version of the response instead of the raw data',
	},
];

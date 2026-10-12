import type {
	IBinaryKeyData,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, sleep } from 'n8n-workflow';

const API = 'https://api.spicrawl.com';
const TERMINAL = ['completed', 'failed', 'cancelled'];
const PAGE_LIMIT = 50;

interface ApiResponse {
	body: string | Buffer;
	headers: Record<string, string | string[] | undefined>;
	statusCode: number;
}

// ---------- helpers ----------

const toText = (body: string | Buffer): string =>
	typeof body === 'string' ? body : Buffer.from(body).toString('utf8');

const header = (res: ApiResponse, name: string): string | undefined => {
	const v = res.headers[name];
	return Array.isArray(v) ? v.join(', ') : v;
};

const num = (v: string | undefined): number | undefined =>
	v === undefined || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v);

const without = (o: IDataObject, ...keys: string[]): IDataObject =>
	Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

const pick = (o: IDataObject, keys: string[]): IDataObject =>
	Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

function problemError(ctx: IExecuteFunctions, res: ApiResponse, itemIndex: number): NodeApiError {
	let problem: IDataObject = {};
	const text = toText(res.body);
	try {
		const parsed: unknown = JSON.parse(text);
		problem = typeof parsed === 'object' && parsed !== null ? (parsed as IDataObject) : {};
	} catch {
		problem = { detail: text.slice(0, 500) };
	}
	const diagnostics = (problem.diagnostics ?? {}) as IDataObject;
	const description = [
		diagnostics.hint,
		problem.retryable === true ? 'This error is retryable.' : undefined,
		problem.request_id ? `Request ID: ${String(problem.request_id)}` : undefined,
	]
		.filter(Boolean)
		.join(' ');
	return new NodeApiError(ctx.getNode(), problem as JsonObject, {
		message: `${String(problem.code ?? 'Spicrawl error')}: ${String(problem.detail ?? problem.title ?? 'Request failed')}`,
		description,
		httpCode: String(res.statusCode),
		itemIndex,
	});
}

// Anything that is not already a NodeApiError or NodeOperationError (a JSON parse failure, say).
export function toNodeError(ctx: IExecuteFunctions, error: unknown, itemIndex: number): Error {
	return error instanceof NodeApiError || error instanceof NodeOperationError
		? error
		: new NodeOperationError(ctx.getNode(), error as Error, { itemIndex });
}

async function api(
	ctx: IExecuteFunctions,
	itemIndex: number,
	method: 'GET' | 'POST',
	path: string,
	opts: { body?: IDataObject; qs?: IDataObject; binary?: boolean } = {},
): Promise<ApiResponse> {
	const res = (await ctx.helpers.httpRequestWithAuthentication.call(ctx, 'spicrawlApi', {
		method,
		url: `${API}${path}`,
		headers: opts.body ? { 'Content-Type': 'application/json' } : {},
		body: opts.body,
		qs: opts.qs,
		encoding: opts.binary ? 'arraybuffer' : 'text',
		returnFullResponse: true,
		ignoreHttpStatusErrors: true,
		timeout: 180000,
	})) as ApiResponse;
	if (res.statusCode >= 400) throw problemError(ctx, res, itemIndex);
	return res;
}

// Request fields that mean the same thing on /v1/scrape and /v1/batch.
function commonBody(o: IDataObject, rendering: string): IDataObject {
	const body: IDataObject = {};
	if (rendering === 'js') body.js_render = true;
	if (rendering === 'auto') body.mode = 'auto';
	if (o.waitFor) body.wait_for = o.waitFor;
	if (o.waitMs) body.wait = o.waitMs;
	if ((o.blockResources as string[] | undefined)?.length) body.block_resources = o.blockResources;
	if (o.proxy) body.proxy = o.proxy;
	if (o.mainContentOnly !== undefined) body.main_content_only = o.mainContentOnly;
	if (o.maxCost) body.max_cost = o.maxCost;
	const headers = (o.customHeaders as { header?: Array<{ name: string; value: string }> })?.header;
	if (headers?.length) {
		body.custom_headers = Object.fromEntries(headers.map((h) => [h.name, h.value]));
	}
	return body;
}

// ---------- Scrape URL ----------

const SCRAPE_SIMPLE = [
	'url',
	'final_url',
	'status',
	'content',
	'credits',
	'warnings',
	'data',
	'empty_fields',
	'links',
	'request_id',
];

export async function scrapeUrl(ctx: IExecuteFunctions, i: number): Promise<INodeExecutionData> {
	const url = (ctx.getNodeParameter('url', i) as string).trim();
	const format = ctx.getNodeParameter('responseFormat', i) as string;
	const rendering = ctx.getNodeParameter('rendering', i) as string;
	const simplify = ctx.getNodeParameter('simplify', i) as boolean;
	const o = ctx.getNodeParameter('options', i) as IDataObject;

	const body: IDataObject = { url, response_format: format, ...commonBody(o, rendering) };
	if (o.bypassCache) body.cache = false;
	if (o.cacheTtl) body.cache_ttl = o.cacheTtl;
	if (o.autoparse) body.autoparse = true;
	if (o.links) body.links = true;
	if (o.screenshot) {
		body.screenshot = true;
		if (o.screenshotFullPage) body.screenshot_fullpage = true;
		if (o.screenshotFormat) body.screenshot_format = o.screenshotFormat;
	}
	if (o.extract) {
		try {
			body.extract = typeof o.extract === 'string' ? JSON.parse(o.extract) : o.extract;
		} catch {
			throw new NodeOperationError(ctx.getNode(), 'Extract Fields is not valid JSON', {
				itemIndex: i,
			});
		}
	}

	const res = await api(ctx, i, 'POST', '/v1/scrape', { body, binary: format === 'pdf' });

	// Metadata the API always sends as headers, whatever the body format.
	const out: IDataObject = {
		url,
		final_url: header(res, 'x-final-url'),
		status: num(header(res, 'x-target-status')),
		credits: num(header(res, 'x-credits-charged')),
		credits_remaining: num(header(res, 'x-credits-remaining')),
		engine: header(res, 'x-engine'),
		proxy_source: header(res, 'x-proxy-source'),
		cache_state: header(res, 'cache-state'),
		request_id: header(res, 'x-request-id'),
		warnings: header(res, 'x-warning') ? [header(res, 'x-warning')] : undefined,
	};
	const binary: IBinaryKeyData = {};
	const contentType = header(res, 'content-type') ?? '';

	if (contentType.includes('json')) {
		// The JSON envelope: set by response_format=json or by extract, links, screenshot, ...
		const envelope = JSON.parse(toText(res.body)) as IDataObject;
		const shots = (envelope.screenshots as IDataObject[] | undefined) ?? [];
		for (const [n, shot] of shots.entries()) {
			const fmt = String(shot.format ?? 'png');
			binary[n === 0 ? 'screenshot' : `screenshot_${n + 1}`] = await ctx.helpers.prepareBinaryData(
				Buffer.from(shot.data as string, 'base64'),
				`screenshot.${fmt}`,
				`image/${fmt}`,
			);
		}
		Object.assign(out, envelope, { screenshots: shots.map((s) => without(s, 'data')) });
	} else if (format === 'pdf') {
		binary.data = await ctx.helpers.prepareBinaryData(
			Buffer.from(res.body),
			'page.pdf',
			'application/pdf',
		);
	} else {
		out.content = toText(res.body);
	}

	const json = simplify ? pick(out, SCRAPE_SIMPLE) : pick(out, Object.keys(out));
	return {
		json,
		binary: Object.keys(binary).length ? binary : undefined,
		pairedItem: { item: i },
	};
}

// ---------- Batch Scrape ----------

const BATCH_SIMPLE = [
	'seq',
	'url',
	'status',
	'http_status',
	'content',
	'content_state',
	'credits',
	'error',
	'batch_id',
];

// A batch result's `content` is the page as a plain string; for response_format=json it is JSON text.
// Tolerant of a non-json format whose content is itself one JSON string literal: that is decoded once.
export function pageContent(content: string, format: string): unknown {
	if (format === 'json') {
		try {
			return JSON.parse(content);
		} catch {
			return content;
		}
	}
	if (content.startsWith('"')) {
		try {
			const decoded: unknown = JSON.parse(content);
			if (typeof decoded === 'string') return decoded;
		} catch {
			// not a JSON string literal: the content is the page
		}
	}
	return content;
}

function batchResultItem(
	line: IDataObject,
	simplify: boolean,
	batchId: string,
	format: string,
): IDataObject {
	const result = line.result as IDataObject | undefined;
	const item: IDataObject = { ...without(line, 'result'), batch_id: batchId };
	item.credits = Number(line.credits_micro ?? 0) / 1e6;
	if (result?.content !== undefined && !result.truncated) {
		item.content = pageContent(result.content as string, format) as IDataObject;
	} else if (result) {
		// Not a full body: say why instead of returning a cut-off page as if it were whole.
		item.content_state = result.truncated
			? 'truncated'
			: result.omitted
				? 'omitted'
				: 'unavailable';
	}
	return simplify ? pick(item, BATCH_SIMPLE) : item;
}

export async function batchScrape(ctx: IExecuteFunctions): Promise<INodeExecutionData[]> {
	const inputs = ctx.getInputData();
	const source = ctx.getNodeParameter('urlSource', 0) as string;
	const format = ctx.getNodeParameter('responseFormat', 0) as string;
	const rendering = ctx.getNodeParameter('rendering', 0) as string;
	const simplify = ctx.getNodeParameter('simplify', 0) as boolean;
	const o = ctx.getNodeParameter('batchOptions', 0) as IDataObject;

	// Item mode keeps one URL per input item, so result seq N maps to input item N.
	const urls =
		source === 'items'
			? inputs.map((_, n) => (ctx.getNodeParameter('itemUrl', n) as string).trim())
			: (ctx.getNodeParameter('urls', 0) as string)
					.split(/[\r\n]+/)
					.map((u) => u.trim())
					.filter(Boolean);
	const blank = urls.indexOf('');
	if (urls.length === 0 || blank >= 0) {
		throw new NodeOperationError(
			ctx.getNode(),
			blank >= 0 ? `Input item ${blank} has no URL` : 'Add at least one URL',
			{ itemIndex: Math.max(blank, 0) },
		);
	}

	const body: IDataObject = {
		urls,
		response_format: format,
		...commonBody(o, rendering),
	};
	if (o.jobName) body.name = o.jobName;
	if (o.concurrency) body.concurrency = o.concurrency;
	if (o.maxAttempts) body.max_attempts = o.maxAttempts;
	if (o.failureThreshold) body.failure_threshold = o.failureThreshold;
	if (o.creditBudget) body.credit_budget = o.creditBudget;

	const parse = (res: ApiResponse) => JSON.parse(toText(res.body)) as IDataObject;

	// Submit. Not idempotent: never resubmit on a dispatch warning, the platform finishes dispatching.
	let job = parse(await api(ctx, 0, 'POST', '/v1/batch', { body }));
	const id = String(job.id);

	// Wait.
	const pollMs = Number(o.pollInterval ?? 5) * 1000;
	const maxWait = Number(o.maxWait ?? 30);
	const deadline = Date.now() + maxWait * 60000;
	while (!TERMINAL.includes(String(job.status))) {
		if (Date.now() > deadline) {
			throw new NodeOperationError(
				ctx.getNode(),
				`Batch job ${id} did not finish within ${maxWait} minutes`,
				{
					description:
						'The job keeps running and is charged per finished page. Its results stay readable for 72 hours, see the Spicrawl dashboard.',
				},
			);
		}
		await sleep(pollMs);
		job = parse(await api(ctx, 0, 'GET', `/v1/batch/${id}`));
	}

	// Results: JSON Lines, paged by the X-Next-Cursor header.
	const out: INodeExecutionData[] = [];
	let cursor: string | undefined;
	let limit = PAGE_LIMIT;
	for (;;) {
		const res = await api(ctx, 0, 'GET', `/v1/batch/${id}/results`, { qs: { limit, cursor } });
		const lines = toText(res.body)
			.split('\n')
			.filter(Boolean)
			.map((l) => JSON.parse(l) as IDataObject);
		// A page has a 2 MiB body budget; if it ran out, ask for the same page again, smaller.
		if (limit > 1 && lines.some((l) => (l.result as IDataObject | undefined)?.omitted)) {
			limit = Math.max(1, Math.floor(limit / 2));
			continue;
		}
		for (const line of lines) {
			out.push({
				json: { ...batchResultItem(line, simplify, id, format), batch_status: String(job.status) },
				pairedItem: { item: source === 'items' ? Number(line.seq) : 0 },
			});
		}
		const next = header(res, 'x-next-cursor');
		if (!next) break;
		cursor = next;
		limit = PAGE_LIMIT;
	}

	if (out.length === 0) {
		// Nothing finished (for example the job failed at once): return the job so the cause is visible.
		const keys = ['id', 'name', 'status', 'error_code', 'error_message', 'total_items', 'progress'];
		return [{ json: pick(job, keys), pairedItem: { item: 0 } }];
	}
	return out;
}

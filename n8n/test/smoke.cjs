// Offline smoke test: runs the built node against a fake n8n context and a local mock of the API.
// Usage: npm run build && npm test
// Runs the built node against a fake n8n execution context.
const path = require('path');
const fs = require('fs');
const PROJ = path.join(__dirname, '..');
const { Spicrawl } = require(path.join(PROJ, 'dist/nodes/Spicrawl/Spicrawl.node.js'));
const { SpicrawlApi } = require(path.join(PROJ, 'dist/credentials/SpicrawlApi.credentials.js'));

const KEY = 'spicrawl_test_mock';

function makeCtx(params, inputs, base, log) {
	return {
		getNode: () => ({ name: 'Spicrawl', type: 'spicrawl', typeVersion: 1 }),
		getInputData: () => inputs,
		continueOnFail: () => false,
		getNodeParameter: (name, i, fallback) => {
			const v = params[name];
			if (v === undefined) {
				if (fallback !== undefined) return fallback;
				throw new Error('missing param ' + name);
			}
			return typeof v === 'function' ? v(i) : v;
		},
		helpers: {
			prepareBinaryData: async (buf, fileName, mimeType) => ({
				data: buf.toString('base64'),
				fileName,
				mimeType,
			}),
			httpRequestWithAuthentication: async function (credType, o) {
				if (credType !== 'spicrawlApi') throw new Error('bad cred ' + credType);
				// apply the credential's generic authenticate exactly as n8n would
				const cred = new SpicrawlApi();
				const authHeader = cred.authenticate.properties.headers.Authorization.replace(
					'=Bearer {{$credentials.apiKey}}',
					'Bearer ' + KEY,
				);
				let url = o.url.replace('https://api.spicrawl.com', base);
				if (o.qs) {
					const q = Object.entries(o.qs)
						.filter(([, v]) => v !== undefined)
						.map(([k, v]) => k + '=' + encodeURIComponent(v))
						.join('&');
					if (q) url += '?' + q;
				}
				log.push({ method: o.method, path: url.replace(base, ''), body: o.body });
				const res = await fetch(url, {
					method: o.method,
					headers: { ...(o.headers || {}), Authorization: authHeader },
					body: o.body ? JSON.stringify(o.body) : undefined,
				});
				const headers = {};
				res.headers.forEach((v, k) => (headers[k] = v));
				const buf = Buffer.from(await res.arrayBuffer());
				return {
					body: o.encoding === 'arraybuffer' ? buf : buf.toString('utf8'),
					headers,
					statusCode: res.status,
				};
			},
		},
	};
}

async function run(params, inputs, base, log) {
	const node = new Spicrawl();
	const ctx = makeCtx(
		{ operation: params.urlSource ? 'batch' : 'scrape', ...params },
		inputs,
		base,
		log,
	);
	return node.execute.call(ctx);
}

const http = require('http');
const assert = require('assert');

const NDJSON = (lines) => lines.map((l) => JSON.stringify(l)).join('\n') + '\n';
const state = {
	polls: 0,
	resultCalls: [],
	contentFor: (seq) => '<p>page ' + seq + '</p>',
};

const server = http.createServer((req, res) => {
	const u = new URL(req.url, 'http://x');
	let body = '';
	req.on('data', (c) => (body += c));
	req.on('end', () => {
		const auth = req.headers.authorization;
		if (auth !== 'Bearer spicrawl_test_mock') {
			res.writeHead(401, { 'content-type': 'application/problem+json' });
			return res.end(
				JSON.stringify({
					code: 'ERR::AUTH::INVALID_KEY',
					title: 'bad',
					detail: 'Key not recognised',
					retryable: false,
				}),
			);
		}
		if (u.pathname === '/v1/scrape') {
			const b = JSON.parse(body);
			if (b.url.includes('boom')) {
				res.writeHead(400, { 'content-type': 'application/problem+json' });
				return res.end(
					JSON.stringify({
						code: 'ERR::REQUEST::INCOMPATIBLE_FLAGS',
						title: 'x',
						detail: 'wait_for needs js_render',
						retryable: false,
						request_id: 'R1',
						diagnostics: { hint: 'Set js_render=true.' },
					}),
				);
			}
			const h = {
				'x-request-id': 'REQ1',
				'x-credits-charged': '1',
				'x-engine': 'fetch',
				'x-target-status': '200',
				'x-final-url': b.url,
				'cache-state': 'miss',
				'x-credits-remaining': '99',
			};
			if (b.response_format === 'pdf') {
				res.writeHead(200, { ...h, 'content-type': 'application/pdf' });
				return res.end(Buffer.from('%PDF-1.4 fake'));
			}
			if (b.screenshot || b.extract || b.response_format === 'json') {
				res.writeHead(200, { ...h, 'content-type': 'application/json' });
				return res.end(
					JSON.stringify({
						url: b.url,
						final_url: b.url,
						status: 200,
						content: '# hi',
						headers: {},
						truncated: false,
						credits: 8,
						engine: 'browser',
						proxy_source: 'direct',
						warnings: [],
						data: { title: 'T' },
						empty_fields: ['price'],
						screenshots: b.screenshot
							? [
									{
										label: 'final',
										encoding: 'base64',
										data: Buffer.from('PNGDATA').toString('base64'),
										size_bytes: 7,
										format: 'png',
										width: 10,
										height: 10,
									},
								]
							: undefined,
					}),
				);
			}
			res.writeHead(200, {
				...h,
				'content-type': 'text/markdown; charset=utf-8',
				'x-warning': 'FORMAT_COERCED: demo',
			});
			return res.end('# Example\nbody');
		}
		if (u.pathname === '/v1/batch' && req.method === 'POST') {
			state.submitted = JSON.parse(body);
			res.writeHead(202, { 'content-type': 'application/json' });
			return res.end(
				JSON.stringify({
					id: 'JOB1',
					status: 'queued',
					status_url: '/v1/batch/JOB1',
					results_url: '/v1/batch/JOB1/results',
					total_items: state.submitted.urls.length,
					progress: {},
				}),
			);
		}
		if (u.pathname === '/v1/batch/JOB1') {
			state.polls++;
			res.writeHead(200, { 'content-type': 'application/json' });
			return res.end(
				JSON.stringify({
					id: 'JOB1',
					status: state.polls < 3 ? 'running' : 'completed',
					total_items: 3,
				}),
			);
		}
		if (u.pathname === '/v1/batch/JOB1/results') {
			const limit = Number(u.searchParams.get('limit'));
			const cursor = u.searchParams.get('cursor');
			state.resultCalls.push({ limit, cursor });
			const line = (seq, extra = {}) => ({
				seq,
				url: 'https://e.com/' + seq,
				status: 'succeeded',
				attempts: 1,
				http_status: 200,
				request_id: 'r' + seq,
				credits_micro: 1000000,
				bytes: 10,
				duration_ms: 5,
				// result.content is the page as a plain string, as the API returns it
				result: { content: state.contentFor(seq), bytes: 20 },
				...extra,
			});
			let lines, next;
			if (!cursor && limit === 50)
				lines = [
					line(0),
					line(1, { result: { bytes: 99, omitted: true } }),
					line(2, { result: { bytes: 99, omitted: true } }),
				];
			// budget spent
			else if (!cursor && limit === 25)
				((lines = [line(0), line(1), line(2, { result: { bytes: 99, omitted: true } })]),
					(next = null));
			// still short
			else lines = [line(0), line(1), line(2)];
			// emulate paging: when limit<=12, return 2 then a cursor
			if (!cursor && limit <= 12) {
				lines = [line(0), line(1)];
				next = 'abcd';
			} else if (cursor === 'abcd') {
				lines = [
					line(2, {
						status: 'failed',
						credits_micro: 0,
						result: undefined,
						error: { code: 'ERR::UPSTREAM::TIMEOUT', retryable: true },
					}),
				];
				next = null;
			}
			res.writeHead(200, {
				'content-type': 'application/x-ndjson',
				...(next ? { 'x-next-cursor': next } : {}),
			});
			return res.end(NDJSON(lines));
		}
		res.writeHead(404);
		res.end('{}');
	});
});

(async () => {
	await new Promise((r) => server.listen(0, r));
	const base = 'http://127.0.0.1:' + server.address().port;
	const J = (x) => JSON.stringify(x, null, 1);

	// 1. scrape markdown fetch
	let log = [];
	let [[it]] = await run(
		{
			url: ' https://example.com ',
			responseFormat: 'markdown',
			rendering: 'fetch',
			simplify: true,
			options: {},
		},
		[{ json: {} }],
		base,
		log,
	);
	assert.deepStrictEqual(log[0].body, { url: 'https://example.com', response_format: 'markdown' });
	assert.strictEqual(it.json.content, '# Example\nbody');
	assert.strictEqual(it.json.status, 200);
	assert.strictEqual(it.json.credits, 1);

	// 2. scrape with options: js, extract, screenshot
	log = [];
	[[it]] = await run(
		{
			url: 'https://example.com',
			responseFormat: 'markdown',
			rendering: 'js',
			simplify: false,
			options: {
				waitFor: '.x',
				waitMs: 500,
				blockResources: ['image'],
				proxy: 'http://p:1',
				bypassCache: true,
				extract: '{"title":"h1"}',
				screenshot: true,
				screenshotFullPage: true,
				screenshotFormat: 'png',
				customHeaders: { header: [{ name: 'A', value: 'b' }] },
				mainContentOnly: true,
				maxCost: 10,
				links: true,
				autoparse: true,
			},
		},
		[{ json: {} }],
		base,
		log,
	);
	assert.strictEqual(log[0].body.js_render, true);
	assert.deepStrictEqual(log[0].body.extract, { title: 'h1' });
	assert.deepStrictEqual(log[0].body.custom_headers, { A: 'b' });
	assert.strictEqual(log[0].body.cache, false);
	assert.ok(it.binary.screenshot);
	assert.strictEqual(Buffer.from(it.binary.screenshot.data, 'base64').toString(), 'PNGDATA');

	// 3. pdf -> binary
	[[it]] = await run(
		{
			url: 'https://example.com',
			responseFormat: 'pdf',
			rendering: 'fetch',
			simplify: true,
			options: {},
		},
		[{ json: {} }],
		base,
		[],
	);
	assert.strictEqual(it.binary.data.mimeType, 'application/pdf');
	assert.ok(Buffer.from(it.binary.data.data, 'base64').toString().startsWith('%PDF'));

	// 4. error mapping
	try {
		await run(
			{
				url: 'https://boom.com',
				responseFormat: 'markdown',
				rendering: 'fetch',
				simplify: true,
				options: {},
			},
			[{ json: {} }],
			base,
			[],
		);
		assert.fail('no throw');
	} catch (e) {
		assert.ok(e.message.startsWith('ERR::REQUEST::INCOMPATIBLE_FLAGS: wait_for'));
		assert.ok(e.description.includes('Set js_render=true.'));
	}

	// 5. batch list mode, omitted-halving + paging
	log = [];
	const out = (
		await run(
			{
				urlSource: 'list',
				urls: 'https://e.com/0\n\n https://e.com/1 \nhttps://e.com/2\n',
				responseFormat: 'markdown',
				rendering: 'js',
				simplify: true,
				batchOptions: {
					pollInterval: 1,
					jobName: 'n',
					concurrency: 5,
					creditBudget: 9,
					maxAttempts: 2,
					failureThreshold: 3,
					maxCost: 4,
				},
			},
			[{ json: {} }],
			base,
			log,
		)
	)[0];
	assert.deepStrictEqual(state.submitted.urls, [
		'https://e.com/0',
		'https://e.com/1',
		'https://e.com/2',
	]);
	assert.strictEqual(state.submitted.name, 'n');
	assert.strictEqual(state.submitted.js_render, true);
	assert.strictEqual(state.submitted.credit_budget, 9);
	assert.strictEqual(out.length, 3);
	assert.strictEqual(out[0].json.content, '<p>page 0</p>');
	assert.strictEqual(out[2].json.error.code, 'ERR::UPSTREAM::TIMEOUT');
	assert.strictEqual(out[2].json.credits, 0);
	assert.ok(state.polls >= 3);

	// 6. batch items mode: URL per input item
	state.polls = 5;
	state.resultCalls = [];
	const outItems = (
		await run(
			{
				urlSource: 'items',
				itemUrl: (i) => 'https://i.com/' + i,
				responseFormat: 'html',
				rendering: 'fetch',
				simplify: false,
				batchOptions: {},
			},
			[{ json: {} }, { json: {} }, { json: {} }],
			base,
			[],
		)
	)[0];
	assert.deepStrictEqual(state.submitted.urls, [
		'https://i.com/0',
		'https://i.com/1',
		'https://i.com/2',
	]);
	assert.strictEqual(state.submitted.js_render, undefined);
	assert.deepStrictEqual(
		outItems.map((x) => x.pairedItem.item),
		[0, 1, 2],
	);

	// 7. batch content: used as-is; parsed only for response_format json; a quoted string is tolerated
	const { pageContent } = require(path.join(PROJ, 'dist/nodes/Spicrawl/execute.js'));
	assert.strictEqual(pageContent('# Title\n"quoted" body', 'markdown'), '# Title\n"quoted" body');
	assert.strictEqual(pageContent('{"a":1}', 'markdown'), '{"a":1}');
	assert.strictEqual(pageContent('"just a string"', 'text'), 'just a string');
	assert.strictEqual(pageContent('"unterminated', 'text'), '"unterminated');
	assert.deepStrictEqual(pageContent('{"a":[1]}', 'json'), { a: [1] });
	assert.strictEqual(pageContent('not json', 'json'), 'not json');

	state.polls = 5;
	state.contentFor = (seq) => JSON.stringify({ title: 'T' + seq });
	const jsonOut = (
		await run(
			{
				urlSource: 'list',
				urls: 'https://e.com/0',
				responseFormat: 'json',
				rendering: 'fetch',
				simplify: true,
				batchOptions: {},
			},
			[{ json: {} }],
			base,
			[],
		)
	)[0];
	assert.strictEqual(state.submitted.response_format, 'json');
	assert.deepStrictEqual(jsonOut[0].json.content, { title: 'T0' });
	state.contentFor = (seq) => JSON.stringify('<p>quoted ' + seq + '</p>');
	state.polls = 5;
	const quotedOut = (
		await run(
			{
				urlSource: 'list',
				urls: 'https://e.com/0',
				responseFormat: 'html',
				rendering: 'fetch',
				simplify: true,
				batchOptions: {},
			},
			[{ json: {} }],
			base,
			[],
		)
	)[0];
	assert.strictEqual(quotedOut[0].json.content, '<p>quoted 0</p>');

	server.close();
	console.log('smoke test passed');
})().catch((e) => {
	console.error('FAIL', e);
	process.exit(1);
});

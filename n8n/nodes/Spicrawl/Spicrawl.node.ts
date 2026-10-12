import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { batchScrape, scrapeUrl, toNodeError } from './execute';
import { properties } from './properties';

export class Spicrawl implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Spicrawl',
		name: 'spicrawl',
		icon: { light: 'file:../../icons/spicrawl.svg', dark: 'file:../../icons/spicrawl.dark.svg' },
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] === "batch" ? "Batch Scrape" : "Scrape URL"}}',
		description: 'Scrape web pages to markdown, HTML, text, PDF or structured data with Spicrawl',
		defaults: {
			name: 'Spicrawl',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'spicrawlApi',
				required: true,
			},
		],
		properties,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const batch = (this.getNodeParameter('operation', 0) as string) === 'batch';
		const out: INodeExecutionData[] = [];
		// Batch Scrape is one job for all input items, so it runs once, not per item.
		const indexes = batch ? [0] : this.getInputData().map((_, i) => i);

		for (const i of indexes) {
			try {
				out.push(...(batch ? await batchScrape(this) : [await scrapeUrl(this, i)]));
			} catch (error) {
				if (!this.continueOnFail()) throw toNodeError(this, error, i);
				out.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
			}
		}
		return [out];
	}
}

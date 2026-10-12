import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class SpicrawlApi implements ICredentialType {
	name = 'spicrawlApi';

	displayName = 'Spicrawl API';

	icon: Icon = { light: 'file:../icons/spicrawl.svg', dark: 'file:../icons/spicrawl.dark.svg' };

	documentationUrl = 'https://docs.spicrawl.com/authentication';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Create a key in the Spicrawl dashboard under API Keys. Live keys start with spicrawl_live_ and spend credits; test keys start with spicrawl_test_.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	// Reading your own request log needs a valid key but no scope, so any key passes.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.spicrawl.com',
			url: '/v1/requests',
			method: 'GET',
			qs: { limit: 1 },
		},
	};
}

const GITHUB_URL_PATTERN = /github\.com\/[^/]+\/[^/]+\/(issues|pull)\/(\d+)/;

export interface ParsedGitHubUrlInfo {
	type: 'issue' | 'pr';
	number: number;
}

export function parseGitHubUrlInfo(url: string): ParsedGitHubUrlInfo | undefined {
	const match = url.match(GITHUB_URL_PATTERN);
	if (match === null) {
		return undefined;
	}
	return {
		type: match[1] === 'pull' ? 'pr' : 'issue',
		number: parseInt(match[2], 10)
	};
}

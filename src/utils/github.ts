import { parseGitHubUrl } from './github-url';

export interface ParsedGitHubUrlInfo {
	type: 'issue' | 'pr';
	number: number;
}

export function parseGitHubUrlInfo(url: string): ParsedGitHubUrlInfo | undefined {
	const parsed = parseGitHubUrl(url);
	if (parsed === undefined) {
		return undefined;
	}
	return {
		type: parsed.type === 'pull' ? 'pr' : 'issue',
		number: parsed.number
	};
}

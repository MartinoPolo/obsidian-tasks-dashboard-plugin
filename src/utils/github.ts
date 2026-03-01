import { parseGitHubUrl, type ParsedGitHubUrl } from './github-url';

export interface ParsedGitHubUrlInfo {
	type: 'issue' | 'pr';
	number: number;
}

const PARSED_GITHUB_URL_TYPE_TO_INFO_TYPE: Record<ParsedGitHubUrl['type'], ParsedGitHubUrlInfo['type']> = {
	issues: 'issue',
	pull: 'pr'
};

function mapParsedGitHubUrlToInfo(parsedUrl: ParsedGitHubUrl): ParsedGitHubUrlInfo {
	return {
		type: PARSED_GITHUB_URL_TYPE_TO_INFO_TYPE[parsedUrl.type],
		number: parsedUrl.number
	};
}

export function parseGitHubUrlInfo(url: string): ParsedGitHubUrlInfo | undefined {
	const parsed = parseGitHubUrl(url);
	if (parsed === undefined) {
		return undefined;
	}
	return mapParsedGitHubUrlToInfo(parsed);
}

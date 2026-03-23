import { isGitHubRepoUrl, parseGitHubUrl, type ParsedGitHubUrl } from './github-url';

export interface ParsedGitHubUrlInfo {
	type: 'issue' | 'pr';
	number: number;
}

export type GitHubLinkType = 'issue' | 'pr' | 'repository';

const PARSED_GITHUB_URL_TYPE_TO_INFO_TYPE: Record<
	ParsedGitHubUrl['type'],
	ParsedGitHubUrlInfo['type']
> = {
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

export function getGitHubLinkType(url: string): GitHubLinkType | undefined {
	const parsed = parseGitHubUrlInfo(url);
	if (parsed !== undefined) {
		return parsed.type;
	}

	if (isGitHubRepoUrl(url)) {
		return 'repository';
	}

	return undefined;
}

export function isGitHubWebUrl(url: string): boolean {
	return /^https?:\/\/github\.com\/[^/]+\/[^/]/.test(url.trim());
}

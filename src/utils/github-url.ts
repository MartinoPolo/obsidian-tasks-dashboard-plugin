export interface ParsedGitHubUrl {
	owner: string;
	repo: string;
	number: number;
	type: 'issues' | 'pull';
}

const GITHUB_ISSUE_PR_PATTERN = /github\.com\/([^/]+)\/([^/]+)\/(issues|pull|pulls)\/(\d+)/;
const GITHUB_REPO_PATTERN = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/;

export function parseGitHubUrl(url: string): ParsedGitHubUrl | undefined {
	const match = url.match(GITHUB_ISSUE_PR_PATTERN);
	if (match === null) {
		return undefined;
	}
	return {
		owner: match[1],
		repo: match[2],
		type: match[3] === 'issues' ? 'issues' : 'pull',
		number: parseInt(match[4], 10)
	};
}

export function isGitHubRepoUrl(url: string): boolean {
	return GITHUB_REPO_PATTERN.test(url);
}

export function parseGitHubRepoName(url: string): { owner: string; repo: string } | undefined {
	const match = url.match(GITHUB_REPO_PATTERN);
	if (match === null) {
		return undefined;
	}
	return { owner: match[1], repo: match[2] };
}

export function parseGitHubRepoFullName(url: string): string | undefined {
	const parsed = parseGitHubRepoName(url);
	if (parsed === undefined) {
		return undefined;
	}
	return `${parsed.owner}/${parsed.repo}`;
}

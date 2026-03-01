export interface ParsedGitHubUrl {
	owner: string;
	repo: string;
	number: number;
	type: 'issues' | 'pull';
}

const GITHUB_ISSUE_PR_PATTERN = /github\.com\/([^/]+)\/([^/]+)\/(issues|pull|pulls)\/(\d+)/;
const GITHUB_REPO_PATTERN = /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)\/?$/;

type RepoName = {
	owner: string;
	repo: string;
};

const ISSUE_PATH_SEGMENT_TO_TYPE: Record<'issues' | 'pull' | 'pulls', ParsedGitHubUrl['type']> = {
	issues: 'issues',
	pull: 'pull',
	pulls: 'pull'
};

function parseIssuePathSegment(value: string): ParsedGitHubUrl['type'] | undefined {
	if (value === 'issues' || value === 'pull' || value === 'pulls') {
		return ISSUE_PATH_SEGMENT_TO_TYPE[value];
	}

	return undefined;
}

function getMatch(url: string, pattern: RegExp): RegExpMatchArray | undefined {
	const match = url.match(pattern);
	if (match === null) {
		return undefined;
	}

	return match;
}

function parseRepoNameFromMatch(match: RegExpMatchArray): RepoName {
	const [, owner, repo] = match;
	return { owner, repo };
}

export function parseGitHubUrl(url: string): ParsedGitHubUrl | undefined {
	const match = getMatch(url, GITHUB_ISSUE_PR_PATTERN);
	if (match === undefined) {
		return undefined;
	}

	const repoName = parseRepoNameFromMatch(match);

	const [, , , issuePathSegment, issueNumberRaw] = match;
	const type = parseIssuePathSegment(issuePathSegment);
	if (type === undefined) {
		return undefined;
	}

	return {
		...repoName,
		type,
		number: Number.parseInt(issueNumberRaw, 10)
	};
}

export function isGitHubRepoUrl(url: string): boolean {
	return GITHUB_REPO_PATTERN.test(url);
}

export function parseGitHubRepoName(url: string): { owner: string; repo: string } | undefined {
	const match = getMatch(url, GITHUB_REPO_PATTERN);
	if (match === undefined) {
		return undefined;
	}

	return parseRepoNameFromMatch(match);
}

export function parseGitHubRepoFullName(url: string): string | undefined {
	const parsed = parseGitHubRepoName(url);
	if (parsed === undefined) {
		return undefined;
	}
	return `${parsed.owner}/${parsed.repo}`;
}

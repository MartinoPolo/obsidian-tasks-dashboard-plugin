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

function parseRepoNameFromMatch(match: RegExpMatchArray): RepoName {
	const [, owner, repo] = match;
	return { owner, repo };
}

export function parseGitHubUrl(url: string): ParsedGitHubUrl | undefined {
	const match = url.match(GITHUB_ISSUE_PR_PATTERN) ?? undefined;
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
	const match = url.match(GITHUB_REPO_PATTERN) ?? undefined;
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

/** Extracts "owner/repo" from a git remote URL (HTTPS or SSH). */
const GIT_REMOTE_HTTPS_PATTERN = /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/;
const GIT_REMOTE_SSH_PATTERN = /github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/;

export function extractRepoFullNameFromRemoteUrl(remoteUrl: string): string | undefined {
	const httpsMatch = remoteUrl.match(GIT_REMOTE_HTTPS_PATTERN) ?? undefined;
	if (httpsMatch !== undefined) {
		return `${httpsMatch[1]}/${httpsMatch[2]}`;
	}

	const sshMatch = remoteUrl.match(GIT_REMOTE_SSH_PATTERN) ?? undefined;
	if (sshMatch !== undefined) {
		return `${sshMatch[1]}/${sshMatch[2]}`;
	}

	return undefined;
}

/** Checks if a git remote URL matches any of the linked repository names. */
export function doesRemoteMatchLinkedRepos(remoteUrl: string, linkedRepos: string[]): boolean {
	const folderRepo = extractRepoFullNameFromRemoteUrl(remoteUrl);
	if (folderRepo === undefined) {
		return false;
	}
	const folderRepoLower = folderRepo.toLowerCase();
	return linkedRepos.some((repo) => repo.toLowerCase() === folderRepoLower);
}

import type { GitHubIssueMetadata } from '../types';
import type { GitHubServiceInstance } from '../github/github-service-types';
import type { PlatformService } from '../utils/platform';
import type {
	BranchStatus,
	IssueGitStatus,
	IssueState,
	LinkedGitHubIssue,
	LinkedPullRequest,
	PrState
} from './git-status-types';

const GIT_STATUS_CACHE_TTL_MS = 5 * 60 * 1000;

interface GitStatusServiceParams {
	branchName: string | undefined;
	originFolder: string | undefined;
	baseBranch: string | undefined;
	githubLinks: string[];
	dashboardId: string;
	issueId: string;
	linkedRepos: string[];
}

export interface GitStatusServiceInstance {
	getIssueGitStatus: (params: GitStatusServiceParams) => Promise<IssueGitStatus>;
	clearCache: () => void;
	invalidate: (dashboardId: string, issueId: string) => void;
}

const PR_STATE_PRIORITY: Record<PrState, number> = {
	'review-requested': 0,
	open: 1,
	draft: 2,
	merged: 3,
	closed: 4,
	none: 5
};

function mapPrStatusToPrState(prStatus: GitHubIssueMetadata['prStatus']): PrState {
	if (prStatus === undefined) {
		return 'none';
	}
	return prStatus;
}

function toLinkedPullRequest(metadata: GitHubIssueMetadata): LinkedPullRequest {
	return {
		number: metadata.number,
		title: metadata.title,
		url: metadata.url,
		state: mapPrStatusToPrState(metadata.prStatus),
		repository: metadata.repository
	};
}

function computeAggregatePrState(pullRequests: LinkedPullRequest[]): PrState {
	if (pullRequests.length === 0) {
		return 'none';
	}

	let bestState: PrState = 'none';
	let bestPriority = PR_STATE_PRIORITY['none'];

	for (const pr of pullRequests) {
		const priority = PR_STATE_PRIORITY[pr.state];
		if (priority < bestPriority) {
			bestPriority = priority;
			bestState = pr.state;
		}
	}

	return bestState;
}

function mapIssueState(metadata: GitHubIssueMetadata): IssueState {
	if (metadata.state === 'closed') {
		return 'closed';
	}
	return 'open';
}

function toLinkedGitHubIssue(metadata: GitHubIssueMetadata): LinkedGitHubIssue {
	return {
		number: metadata.number,
		title: metadata.title,
		url: metadata.url,
		state: mapIssueState(metadata),
		repository: metadata.repository
	};
}

function deduplicatePullRequests(pullRequests: LinkedPullRequest[]): LinkedPullRequest[] {
	const seen = new Set<string>();
	const unique: LinkedPullRequest[] = [];

	for (const pr of pullRequests) {
		const key = `${pr.repository}#${pr.number}`;
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		unique.push(pr);
	}

	return unique;
}

export function createGitStatusService(
	githubService: GitHubServiceInstance,
	platformService: PlatformService
): GitStatusServiceInstance {
	const cache = new Map<string, { data: IssueGitStatus; timestamp: number }>();

	const clearCache = (): void => {
		cache.clear();
	};

	const invalidate = (dashboardId: string, issueId: string): void => {
		cache.delete(`${dashboardId}:${issueId}`);
	};

	const getCached = (key: string): IssueGitStatus | undefined => {
		const entry = cache.get(key);
		if (entry === undefined) {
			return undefined;
		}
		if (Date.now() - entry.timestamp > GIT_STATUS_CACHE_TTL_MS) {
			cache.delete(key);
			return undefined;
		}
		return entry.data;
	};

	const resolveBranchStatus = (
		branchName: string | undefined,
		originFolder: string | undefined
	): BranchStatus => {
		if (branchName === undefined || branchName === '') {
			return 'unknown';
		}
		if (originFolder === undefined || originFolder === '') {
			return 'unknown';
		}

		const result = platformService.checkBranchExists(originFolder, branchName);
		if (result === 'remote') {
			return 'active';
		}
		if (result === 'local') {
			return 'local';
		}
		return 'deleted';
	};

	const discoverPullRequests = async (
		params: GitStatusServiceParams
	): Promise<LinkedPullRequest[]> => {
		const allPullRequests: LinkedPullRequest[] = [];

		// Discover PRs by branch name from linked repos
		if (params.branchName !== undefined && params.branchName !== '') {
			for (const repoFullName of params.linkedRepos) {
				const parts = repoFullName.split('/');
				if (parts.length !== 2) {
					continue;
				}
				const [owner, repo] = parts;
				try {
					const branchPrs = await githubService.getPullRequestsByBranch(
						owner,
						repo,
						params.branchName
					);
					for (const pr of branchPrs) {
						if (pr.isPR) {
							allPullRequests.push(toLinkedPullRequest(pr));
						}
					}
				} catch {
					// Ignore API errors for individual repos
				}
			}
		}

		// Also include PRs from explicitly linked GitHub URLs
		for (const githubUrl of params.githubLinks) {
			try {
				const metadata = await githubService.getMetadataFromUrl(githubUrl);
				if (metadata !== undefined && metadata.isPR) {
					allPullRequests.push(toLinkedPullRequest(metadata));
				}
			} catch {
				// Ignore
			}
		}

		return deduplicatePullRequests(allPullRequests);
	};

	const discoverLinkedIssues = async (
		params: GitStatusServiceParams
	): Promise<LinkedGitHubIssue[]> => {
		const linkedIssues: LinkedGitHubIssue[] = [];
		const seen = new Set<string>();

		for (const githubUrl of params.githubLinks) {
			try {
				const metadata = await githubService.getMetadataFromUrl(githubUrl);
				if (metadata === undefined || metadata.isPR) {
					continue;
				}
				const key = `${metadata.repository}#${metadata.number}`;
				if (seen.has(key)) {
					continue;
				}
				seen.add(key);
				linkedIssues.push(toLinkedGitHubIssue(metadata));
			} catch {
				// Ignore
			}
		}

		return linkedIssues;
	};

	const getIssueGitStatus = async (params: GitStatusServiceParams): Promise<IssueGitStatus> => {
		const cacheKey = `${params.dashboardId}:${params.issueId}`;
		const cached = getCached(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const branchStatus = resolveBranchStatus(params.branchName, params.originFolder);

		let linkedPullRequests: LinkedPullRequest[] = [];
		let linkedIssues: LinkedGitHubIssue[] = [];
		if (githubService.isAuthenticated()) {
			linkedPullRequests = await discoverPullRequests(params);
			linkedIssues = await discoverLinkedIssues(params);
		}

		const aggregatePrState = computeAggregatePrState(linkedPullRequests);
		const fetchedAt = Date.now();

		const status: IssueGitStatus = {
			branchName: params.branchName,
			branchStatus,
			baseBranch: params.baseBranch,
			linkedPullRequests,
			linkedIssues,
			aggregatePrState,
			fetchedAt
		};

		cache.set(cacheKey, { data: status, timestamp: fetchedAt });
		return status;
	};

	return { getIssueGitStatus, clearCache, invalidate };
}

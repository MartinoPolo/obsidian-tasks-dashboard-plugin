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
import { notifyCacheUpdate } from './git-status-cache-signal';
import { createFetchCoordinator, resolveRepoRoot } from './git-fetch-coordinator';
import { getBehindCount, detectMergeConflicts } from './git-local-detection';

const GIT_STATUS_CACHE_TTL_MS = 5 * 60 * 1000;

interface GitStatusServiceParams {
	branchName: string | undefined;
	originFolder: string | undefined;
	worktreeFolder: string | undefined;
	baseBranch: string | undefined;
	githubLinks: string[];
	dashboardId: string;
	issueId: string;
	linkedRepos: string[];
}

export interface GitStatusServiceInstance {
	getIssueGitStatus: (params: GitStatusServiceParams) => Promise<IssueGitStatus>;
	getCachedStatus: (dashboardId: string, issueId: string) => IssueGitStatus | undefined;
	hasUnsyncedBranches: (dashboardId: string) => boolean;
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

function parseRepoFullName(fullName: string): { owner: string; repo: string } | undefined {
	const parts = fullName.split('/');
	if (parts.length !== 2) {
		return undefined;
	}
	return { owner: parts[0], repo: parts[1] };
}

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
	const fetchCoordinator = createFetchCoordinator();

	const clearCache = (): void => {
		cache.clear();
		fetchCoordinator.reset();
		notifyCacheUpdate();
	};

	const invalidate = (dashboardId: string, issueId: string): void => {
		cache.delete(`${dashboardId}:${issueId}`);
		notifyCacheUpdate();
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
			// Branch exists locally but not on remote — check if it was ever pushed
			const hadUpstream = platformService.hasBranchUpstreamConfig(originFolder, branchName);
			return hadUpstream ? 'remote-gone' : 'local';
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
				const parsed = parseRepoFullName(repoFullName);
				if (parsed === undefined) {
					continue;
				}
				try {
					const branchPrs = await githubService.getPullRequestsByBranch(
						parsed.owner,
						parsed.repo,
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
		let behindBaseCount: number | undefined;
		let mergeConflict: boolean | undefined;

		if (githubService.isAuthenticated()) {
			linkedPullRequests = await discoverPullRequests(params);
			linkedIssues = await discoverLinkedIssues(params);
		}

		// Local git detection — runs from worktree folder where HEAD is the feature branch
		const detectionFolder = params.worktreeFolder ?? params.originFolder;
		if (
			params.baseBranch !== undefined &&
			branchStatus === 'active' &&
			detectionFolder !== undefined
		) {
			const repoRoot = resolveRepoRoot(detectionFolder);
			if (repoRoot !== undefined) {
				try {
					await fetchCoordinator.fetchOnce(repoRoot);
				} catch {
					// Fetch failed — continue with potentially stale refs
				}
			}

			const count = getBehindCount(detectionFolder, params.baseBranch);
			if (count !== undefined) {
				behindBaseCount = count;
			}

			try {
				const hasConflicts = await detectMergeConflicts(detectionFolder, params.baseBranch);
				if (hasConflicts !== undefined) {
					mergeConflict = hasConflicts;
				}
			} catch {
				// Graceful degradation — field stays undefined
			}
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
			behindBaseCount,
			mergeConflict,
			fetchedAt
		};

		cache.set(cacheKey, { data: status, timestamp: fetchedAt });
		notifyCacheUpdate();
		return status;
	};

	const getCachedStatus = (dashboardId: string, issueId: string): IssueGitStatus | undefined => {
		return getCached(`${dashboardId}:${issueId}`);
	};

	const hasUnsyncedBranches = (dashboardId: string): boolean => {
		const prefix = `${dashboardId}:`;
		for (const [key, entry] of cache) {
			if (!key.startsWith(prefix)) {
				continue;
			}
			if (Date.now() - entry.timestamp > GIT_STATUS_CACHE_TTL_MS) {
				continue;
			}
			const behindCount = entry.data.behindBaseCount;
			if (behindCount !== undefined && behindCount > 0) {
				return true;
			}
		}
		return false;
	};

	return { getIssueGitStatus, getCachedStatus, hasUnsyncedBranches, clearCache, invalidate };
}

import type { GitHubIssueMetadata } from '../../types';
import type { GitHubSearchMode } from '../../modals/GitHubSearchModal';
import type { GitHubServiceInstance } from '../../github/github-service-types';
import {
	MAX_COMBINED_RESULTS,
	RECENT_ISSUES_FETCH_LIMIT,
	RECENT_ISSUES_LIMIT
} from './github-search-config';

export function isGitHubUrl(text: string): boolean {
	return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/(issues|pull)\/\d+$/.test(text.trim());
}

export function isResultAllowedByMode(item: GitHubIssueMetadata, mode: GitHubSearchMode): boolean {
	if (mode === 'issues-only') {
		return item.isPR === false;
	}
	if (mode === 'prs-only') {
		return item.isPR === true;
	}
	return true;
}

export function rankResults(
	results: GitHubIssueMetadata[],
	currentUsername?: string
): GitHubIssueMetadata[] {
	const normalizedUsername = currentUsername?.toLowerCase();
	return [...results].sort((left, right) => {
		const leftAssigned =
			normalizedUsername !== undefined &&
			left.assignees.some((assignee) => assignee.toLowerCase() === normalizedUsername)
				? 1
				: 0;
		const rightAssigned =
			normalizedUsername !== undefined &&
			right.assignees.some((assignee) => assignee.toLowerCase() === normalizedUsername)
				? 1
				: 0;
		if (leftAssigned !== rightAssigned) {
			return rightAssigned - leftAssigned;
		}
		return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
	});
}

export interface SearchResults {
	results: GitHubIssueMetadata[];
	title: string;
}

export interface SearchEngineInstance {
	searchByMode: (query: string) => Promise<GitHubIssueMetadata[]>;
	getNumericRepositoryMatches: (query: string) => Promise<GitHubIssueMetadata[]>;
	performSearch: (
		query: string,
		authenticatedUsername: string | undefined
	) => Promise<SearchResults>;
	loadRecentIssues: (authenticatedUsername: string | undefined) => Promise<SearchResults>;
}

interface SearchEngineDependencies {
	githubService: GitHubServiceInstance;
	searchMode: GitHubSearchMode;
	getRepoForCurrentScope: () => string | undefined;
	isMyReposScope: () => boolean;
}

export function createSearchEngine(dependencies: SearchEngineDependencies): SearchEngineInstance {
	const { githubService, searchMode, getRepoForCurrentScope, isMyReposScope } = dependencies;

	async function searchMyRepos(query: string): Promise<GitHubIssueMetadata[]> {
		if (searchMode === 'issues-only') {
			const issueResults = await githubService.searchIssuesInMyRepos(query);
			return issueResults.items;
		}
		if (searchMode === 'prs-only') {
			const prResults = await githubService.searchPullRequestsInMyRepos(query);
			return prResults.items;
		}
		const [issueResults, prResults] = await Promise.all([
			githubService.searchIssuesInMyRepos(query),
			githubService.searchPullRequestsInMyRepos(query)
		]);
		return [...issueResults.items, ...prResults.items];
	}

	async function searchInRepo(query: string, repo: string): Promise<GitHubIssueMetadata[]> {
		if (searchMode === 'issues-only') {
			const issueResults = await githubService.searchIssues(query, repo);
			return issueResults.items;
		}
		if (searchMode === 'prs-only') {
			const prResults = await githubService.searchPullRequests(query, repo);
			return prResults.items;
		}
		const [issueResults, prResults] = await Promise.all([
			githubService.searchIssues(query, repo),
			githubService.searchPullRequests(query, repo)
		]);
		return [...issueResults.items, ...prResults.items];
	}

	async function searchByMode(query: string): Promise<GitHubIssueMetadata[]> {
		if (isMyReposScope()) {
			return searchMyRepos(query);
		}

		const repo = getRepoForCurrentScope();
		if (repo === undefined || repo === '') {
			return [];
		}

		return searchInRepo(query, repo);
	}

	async function getNumericRepositoryMatches(query: string): Promise<GitHubIssueMetadata[]> {
		if (!/^\d+$/.test(query)) {
			return [];
		}
		const scopedRepository = getRepoForCurrentScope();
		if (scopedRepository === undefined || scopedRepository === '') {
			return [];
		}
		const recent = await githubService.getRecentIssues(
			scopedRepository,
			RECENT_ISSUES_FETCH_LIMIT
		);
		return recent.filter((item) => {
			return String(item.number).includes(query) && isResultAllowedByMode(item, searchMode);
		});
	}

	async function performSearch(
		query: string,
		authenticatedUsername: string | undefined
	): Promise<SearchResults> {
		const searchResults = await searchByMode(query);
		const numericMatches = await getNumericRepositoryMatches(query);

		const unique = new Map<string, GitHubIssueMetadata>();
		for (const match of numericMatches) {
			unique.set(match.url, match);
		}
		for (const result of rankResults(searchResults, authenticatedUsername)) {
			unique.set(result.url, result);
		}

		const combined = Array.from(unique.values()).slice(0, MAX_COMBINED_RESULTS);
		return {
			results: combined,
			title: `Search Results (${combined.length})`
		};
	}

	async function loadRecentIssues(
		authenticatedUsername: string | undefined
	): Promise<SearchResults> {
		if (isMyReposScope()) {
			const results = rankResults(await searchByMode(''), authenticatedUsername).slice(
				0,
				RECENT_ISSUES_LIMIT
			);
			return { results, title: 'Recent Issues' };
		}

		const repo = getRepoForCurrentScope();
		if (repo === undefined || repo === '') {
			return { results: [], title: 'Recent Issues' };
		}

		const recentResults = await githubService.getRecentIssues(repo, RECENT_ISSUES_FETCH_LIMIT);
		const results = rankResults(
			recentResults.filter((item) => isResultAllowedByMode(item, searchMode)),
			authenticatedUsername
		).slice(0, RECENT_ISSUES_LIMIT);
		return { results, title: 'Recent Issues' };
	}

	return {
		searchByMode,
		getNumericRepositoryMatches,
		performSearch,
		loadRecentIssues
	};
}

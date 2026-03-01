import { GitHubAuth, GitHubIssueMetadata, GitHubRateLimit, GitHubRepoMetadata, GitHubRepository } from '../types';
import { ParsedGitHubUrl } from '../utils/github-url';

export interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

export interface GitHubSearchResult {
	items: GitHubIssueMetadata[];
	totalCount: number;
}

export type GitHubIssueState = GitHubIssueMetadata['state'];

export interface GitHubServiceInstance {
	setAuth: (auth: GitHubAuth) => void;
	validateToken: () => Promise<{ valid: boolean; username?: string; error?: string }>;
	getIssue: (owner: string, repo: string, number: number) => Promise<GitHubIssueMetadata | undefined>;
	getPullRequest: (
		owner: string,
		repo: string,
		number: number
	) => Promise<GitHubIssueMetadata | undefined>;
	searchIssues: (query: string, repo?: string) => Promise<GitHubSearchResult>;
	searchPullRequests: (query: string, repo?: string) => Promise<GitHubSearchResult>;
	searchIssuesInMyRepos: (query: string) => Promise<GitHubSearchResult>;
	searchPullRequestsInMyRepos: (query: string) => Promise<GitHubSearchResult>;
	getRecentIssues: (repo?: string, limit?: number) => Promise<GitHubIssueMetadata[]>;
	parseGitHubUrl: (url: string) => ParsedGitHubUrl | undefined;
	getMetadataFromUrl: (url: string) => Promise<GitHubIssueMetadata | undefined>;
	getUserRepositories: () => Promise<GitHubRepository[]>;
	getRepository: (owner: string, repo: string) => Promise<GitHubRepoMetadata | undefined>;
	getAuthenticatedUser: () => Promise<string | undefined>;
	getUserOrganizations: () => Promise<string[]>;
	clearCache: () => void;
	clearCacheForUrl: (url: string) => void;
	isAuthenticated: () => boolean;
	getRateLimit: () => GitHubRateLimit | undefined;
}

export type GitHubApiErrorKind = 'auth' | 'not-found' | 'rate-limit' | 'network';

export class GitHubApiError extends Error {
	constructor(
		public readonly kind: GitHubApiErrorKind,
		public readonly statusCode: number | undefined,
		message: string
	) {
		super(message);
		this.name = 'GitHubApiError';
	}
}

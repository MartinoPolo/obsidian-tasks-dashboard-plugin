import { requestUrl, RequestUrlResponse } from 'obsidian';
import {
	GitHubAuth,
	GitHubIssueMetadata,
	GitHubLabel,
	GitHubRateLimit,
	GitHubRepository
} from '../types';

interface CacheEntry<T> {
	data: T;
	timestamp: number;
}

interface GitHubSearchResult {
	items: GitHubIssueMetadata[];
	totalCount: number;
}

interface ParsedGitHubUrl {
	owner: string;
	repo: string;
	number: number;
	type: 'issues' | 'pull';
}

export interface GitHubServiceInstance {
	setAuth: (auth: GitHubAuth) => void;
	validateToken: () => Promise<{ valid: boolean; username?: string; error?: string }>;
	getIssue: (
		owner: string,
		repo: string,
		number: number
	) => Promise<GitHubIssueMetadata | undefined>;
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
	getAuthenticatedUser: () => Promise<string | undefined>;
	getUserOrganizations: () => Promise<string[]>;
	clearCache: () => void;
	clearCacheForUrl: (url: string) => void;
	isAuthenticated: () => boolean;
	getRateLimit: () => GitHubRateLimit | undefined;
}

const CACHE_TTL = 5 * 60 * 1000;
const API_BASE = 'https://api.github.com';

export function createGitHubService(): GitHubServiceInstance {
	let auth: GitHubAuth = { method: 'none' };
	let rateLimit: GitHubRateLimit | undefined;
	const cache = new Map<string, CacheEntry<unknown>>();

	const parseRateLimitHeaders = (headers: Record<string, string>): void => {
		if (
			!('x-ratelimit-limit' in headers) ||
			!('x-ratelimit-remaining' in headers) ||
			!('x-ratelimit-reset' in headers)
		) {
			return;
		}

		const parsedLimit = parseInt(headers['x-ratelimit-limit'], 10);
		const parsedRemaining = parseInt(headers['x-ratelimit-remaining'], 10);
		const parsedReset = parseInt(headers['x-ratelimit-reset'], 10);

		if (isNaN(parsedLimit) || isNaN(parsedRemaining) || isNaN(parsedReset)) {
			return;
		}

		rateLimit = {
			limit: parsedLimit,
			remaining: parsedRemaining,
			resetTimestamp: parsedReset
		};
	};

	const getRateLimit = (): GitHubRateLimit | undefined => {
		return rateLimit;
	};

	const setAuth = (newAuth: GitHubAuth): void => {
		auth = newAuth;
		cache.clear();
		rateLimit = undefined;
	};

	const isAuthenticated = (): boolean => {
		return auth.method === 'pat' && auth.token !== undefined && auth.token !== '';
	};

	const getHeaders = (): Record<string, string> => {
		const headers: Record<string, string> = {
			Accept: 'application/vnd.github.v3+json',
			'User-Agent': 'Obsidian-Tasks-Dashboard'
		};
		if (auth.method === 'pat' && auth.token !== undefined) {
			headers['Authorization'] = `Bearer ${auth.token}`;
		}
		return headers;
	};

	const getCached = <T>(key: string): T | undefined => {
		const entry = cache.get(key) as CacheEntry<T> | undefined;
		if (entry === undefined) {
			return undefined;
		}
		if (Date.now() - entry.timestamp > CACHE_TTL) {
			cache.delete(key);
			return undefined;
		}
		return entry.data;
	};

	const setCache = <T>(key: string, data: T): void => {
		cache.set(key, { data, timestamp: Date.now() });
	};

	const clearCache = (): void => {
		cache.clear();
	};

	const clearCacheForUrl = (url: string): void => {
		const parsed = parseGitHubUrl(url);
		if (parsed === undefined) {
			return;
		}
		const cacheKeyPrefix =
			parsed.type === 'pull'
				? `pr:${parsed.owner}/${parsed.repo}#${parsed.number}`
				: `issue:${parsed.owner}/${parsed.repo}#${parsed.number}`;
		cache.delete(cacheKeyPrefix);
	};

	const apiRequest = async <T>(endpoint: string): Promise<T | undefined> => {
		try {
			const response: RequestUrlResponse = await requestUrl({
				url: `${API_BASE}${endpoint}`,
				headers: getHeaders()
			});
			parseRateLimitHeaders(response.headers);
			return response.json as T;
		} catch (error) {
			console.error('GitHub API error:', error);
			return undefined;
		}
	};

	const validateToken = async (): Promise<{
		valid: boolean;
		username?: string;
		error?: string;
	}> => {
		if (!isAuthenticated()) {
			return { valid: false, error: 'No token configured' };
		}
		try {
			const response = await requestUrl({
				url: `${API_BASE}/user`,
				headers: getHeaders()
			});
			parseRateLimitHeaders(response.headers);
			const data = response.json as { login: string };
			return { valid: true, username: data.login };
		} catch (error) {
			const err = error as { status?: number };
			if (err.status === 401) {
				return { valid: false, error: 'Invalid or expired token' };
			}
			return { valid: false, error: 'Failed to validate token' };
		}
	};

	const parseGitHubUrl = (url: string): ParsedGitHubUrl | undefined => {
		const patterns = [
			/github\.com\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/,
			/github\.com\/([^/]+)\/([^/]+)\/pulls\/(\d+)/
		];

		for (const pattern of patterns) {
			const match = url.match(pattern);
			if (match !== null) {
				const [, owner, repo, typeOrNumber, numberOrUndefined] = match;
				if (typeOrNumber === 'issues' || typeOrNumber === 'pull') {
					return {
						owner,
						repo,
						type: typeOrNumber === 'pull' ? 'pull' : 'issues',
						number: parseInt(numberOrUndefined, 10)
					};
				}
				return {
					owner,
					repo,
					type: 'pull',
					number: parseInt(typeOrNumber, 10)
				};
			}
		}
		return undefined;
	};

	const mapIssueResponse = (
		data: GitHubIssueApiResponse,
		owner: string,
		repo: string
	): GitHubIssueMetadata => {
		const isPR = data.pull_request !== undefined;
		let prStatus: 'merged' | 'draft' | 'open' | 'closed' | undefined;

		if (isPR) {
			if (data.state === 'closed' && data.pull_request?.merged_at !== undefined) {
				prStatus = 'merged';
			} else if (data.draft === true) {
				prStatus = 'draft';
			} else if (data.state === 'closed') {
				prStatus = 'closed';
			} else {
				prStatus = 'open';
			}
		}

		return {
			number: data.number,
			title: data.title,
			state: data.state as 'open' | 'closed',
			labels: data.labels.map((label): GitHubLabel => {
				if (typeof label === 'string') {
					return { name: label, color: '888888' };
				}
				return {
					name: label.name,
					color: label.color !== undefined && label.color !== '' ? label.color : '888888'
				};
			}),
			assignees: data.assignees !== undefined ? data.assignees.map((a) => a.login) : [],
			body: data.body !== null ? data.body : undefined,
			createdAt: data.created_at,
			updatedAt: data.updated_at,
			repository: `${owner}/${repo}`,
			url: data.html_url,
			isPR,
			prStatus
		};
	};

	const getIssue = async (
		owner: string,
		repo: string,
		number: number
	): Promise<GitHubIssueMetadata | undefined> => {
		const cacheKey = `issue:${owner}/${repo}#${number}`;
		const cached = getCached<GitHubIssueMetadata>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const data = await apiRequest<GitHubIssueApiResponse>(
			`/repos/${owner}/${repo}/issues/${number}`
		);
		if (data === undefined) {
			return undefined;
		}

		const metadata = mapIssueResponse(data, owner, repo);
		setCache(cacheKey, metadata);
		return metadata;
	};

	const getPullRequest = async (
		owner: string,
		repo: string,
		number: number
	): Promise<GitHubIssueMetadata | undefined> => {
		const cacheKey = `pr:${owner}/${repo}#${number}`;
		const cached = getCached<GitHubIssueMetadata>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const data = await apiRequest<GitHubPullRequestApiResponse>(
			`/repos/${owner}/${repo}/pulls/${number}`
		);
		if (data === undefined) {
			return undefined;
		}

		const metadata: GitHubIssueMetadata = {
			number: data.number,
			title: data.title,
			state: data.state as 'open' | 'closed',
			labels: data.labels.map((label): GitHubLabel => {
				if (typeof label === 'string') {
					return { name: label, color: '888888' };
				}
				return {
					name: label.name,
					color: label.color !== undefined && label.color !== '' ? label.color : '888888'
				};
			}),
			assignees: data.assignees !== undefined ? data.assignees.map((a) => a.login) : [],
			body: data.body !== null ? data.body : undefined,
			createdAt: data.created_at,
			updatedAt: data.updated_at,
			repository: `${owner}/${repo}`,
			url: data.html_url,
			isPR: true,
			prStatus: data.merged
				? 'merged'
				: data.draft
					? 'draft'
					: data.state === 'closed'
						? 'closed'
						: 'open'
		};

		setCache(cacheKey, metadata);
		return metadata;
	};

	const getMetadataFromUrl = async (url: string): Promise<GitHubIssueMetadata | undefined> => {
		const parsed = parseGitHubUrl(url);
		if (parsed === undefined) {
			return undefined;
		}

		if (parsed.type === 'pull') {
			return getPullRequest(parsed.owner, parsed.repo, parsed.number);
		}
		return getIssue(parsed.owner, parsed.repo, parsed.number);
	};

	const searchIssues = async (query: string, repo?: string): Promise<GitHubSearchResult> => {
		if (!isAuthenticated()) {
			return { items: [], totalCount: 0 };
		}

		let searchQuery = query;
		if (repo !== undefined && repo !== '') {
			searchQuery = `repo:${repo} ${query}`;
		}
		searchQuery = `${searchQuery} is:issue`;

		const cacheKey = `search:issues:${searchQuery}`;
		const cached = getCached<GitHubSearchResult>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const data = await apiRequest<GitHubSearchApiResponse>(
			`/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=20&sort=updated`
		);

		if (data === undefined) {
			return { items: [], totalCount: 0 };
		}

		const items = data.items.map((item) => {
			const repoMatch = item.repository_url.match(/repos\/([^/]+)\/([^/]+)$/);
			const [owner, repoName] = repoMatch ? [repoMatch[1], repoMatch[2]] : ['', ''];
			return mapIssueResponse(item, owner, repoName);
		});

		const result = { items, totalCount: data.total_count };
		setCache(cacheKey, result);
		return result;
	};

	const searchPullRequests = async (query: string, repo?: string): Promise<GitHubSearchResult> => {
		if (!isAuthenticated()) {
			return { items: [], totalCount: 0 };
		}

		let searchQuery = query;
		if (repo !== undefined && repo !== '') {
			searchQuery = `repo:${repo} ${query}`;
		}
		searchQuery = `${searchQuery} is:pr`;

		const cacheKey = `search:pr:${searchQuery}`;
		const cached = getCached<GitHubSearchResult>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const data = await apiRequest<GitHubSearchApiResponse>(
			`/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=20&sort=updated`
		);

		if (data === undefined) {
			return { items: [], totalCount: 0 };
		}

		const items = data.items.map((item) => {
			const repoMatch = item.repository_url.match(/repos\/([^/]+)\/([^/]+)$/);
			const [owner, repoName] = repoMatch ? [repoMatch[1], repoMatch[2]] : ['', ''];
			return mapIssueResponse(item, owner, repoName);
		});

		const result = { items, totalCount: data.total_count };
		setCache(cacheKey, result);
		return result;
	};

	const getRecentIssues = async (repo?: string, limit = 10): Promise<GitHubIssueMetadata[]> => {
		if (!isAuthenticated()) {
			return [];
		}

		if (repo !== undefined && repo !== '') {
			const cacheKey = `recent:${repo}:${limit}`;
			const cached = getCached<GitHubIssueMetadata[]>(cacheKey);
			if (cached !== undefined) {
				return cached;
			}

			const [owner, repoName] = repo.split('/');
			const data = await apiRequest<GitHubIssueApiResponse[]>(
				`/repos/${owner}/${repoName}/issues?state=all&per_page=${limit}&sort=updated`
			);

			if (data === undefined) {
				return [];
			}

			const items = data.map((item) => mapIssueResponse(item, owner, repoName));
			setCache(cacheKey, items);
			return items;
		}

		const result = await searchIssues('', repo);
		return result.items.slice(0, limit);
	};

	const getUserRepositories = async (): Promise<GitHubRepository[]> => {
		if (!isAuthenticated()) {
			return [];
		}

		const cacheKey = 'user:repos';
		const cached = getCached<GitHubRepository[]>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const data = await apiRequest<GitHubRepoApiResponse[]>(
			'/user/repos?sort=pushed&per_page=100&type=all'
		);
		if (data === undefined) {
			return [];
		}

		const repositories: GitHubRepository[] = data.map((repo) => ({
			fullName: repo.full_name,
			description: repo.description ?? '',
			isPrivate: repo.private
		}));

		setCache(cacheKey, repositories);
		return repositories;
	};

	const getAuthenticatedUser = async (): Promise<string | undefined> => {
		if (!isAuthenticated()) {
			return undefined;
		}

		const cacheKey = 'user:profile';
		const cached = getCached<string>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const data = await apiRequest<GitHubUserApiResponse>('/user');
		if (data === undefined) {
			return undefined;
		}

		setCache(cacheKey, data.login);
		return data.login;
	};

	const getUserOrganizations = async (): Promise<string[]> => {
		if (!isAuthenticated()) {
			return [];
		}

		const cacheKey = 'user:orgs';
		const cached = getCached<string[]>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const data = await apiRequest<GitHubOrgApiResponse[]>('/user/orgs');
		if (data === undefined) {
			return [];
		}

		const orgNames = data.map((org) => org.login);
		setCache(cacheKey, orgNames);
		return orgNames;
	};

	const MAX_PARALLEL_ORG_QUERIES = 5;

	const searchInMyRepos = async (
		query: string,
		issueType: 'issue' | 'pr'
	): Promise<GitHubSearchResult> => {
		if (!isAuthenticated()) {
			return { items: [], totalCount: 0 };
		}

		const cacheKey = `search:my-repos:${issueType}:${query}`;
		const cached = getCached<GitHubSearchResult>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const [username, organizations] = await Promise.all([
			getAuthenticatedUser(),
			getUserOrganizations()
		]);

		if (username === undefined) {
			return { items: [], totalCount: 0 };
		}

		const typeQualifier = issueType === 'issue' ? 'is:issue' : 'is:pr';
		let allItems: GitHubIssueMetadata[];

		if (organizations.length > MAX_PARALLEL_ORG_QUERIES) {
			// Fallback: global search + client-side owner filter
			const searchQuery = `${query} ${typeQualifier}`;
			const data = await apiRequest<GitHubSearchApiResponse>(
				`/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=50&sort=updated`
			);

			if (data === undefined) {
				return { items: [], totalCount: 0 };
			}

			const allowedOwners = new Set([username, ...organizations]);
			allItems = data.items
				.map((item) => {
					const repoMatch = item.repository_url.match(/repos\/([^/]+)\/([^/]+)$/);
					const [owner, repoName] = repoMatch ? [repoMatch[1], repoMatch[2]] : ['', ''];
					return mapIssueResponse(item, owner, repoName);
				})
				.filter((item) => {
					const owner = item.repository.split('/')[0];
					return allowedOwners.has(owner);
				});
		} else {
			// Parallel queries: user:{login} + org:{orgName} for each
			const qualifiers = [`user:${username}`, ...organizations.map((org) => `org:${org}`)];
			const searchQueries = qualifiers.map((qualifier) => `${qualifier} ${query} ${typeQualifier}`);

			const results = await Promise.all(
				searchQueries.map((searchQuery) =>
					apiRequest<GitHubSearchApiResponse>(
						`/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=20&sort=updated`
					)
				)
			);

			allItems = [];
			const seenUrls = new Set<string>();

			for (const data of results) {
				if (data === undefined) {
					continue;
				}
				for (const item of data.items) {
					if (seenUrls.has(item.html_url)) {
						continue;
					}
					seenUrls.add(item.html_url);

					const repoMatch = item.repository_url.match(/repos\/([^/]+)\/([^/]+)$/);
					const [owner, repoName] = repoMatch ? [repoMatch[1], repoMatch[2]] : ['', ''];
					allItems.push(mapIssueResponse(item, owner, repoName));
				}
			}
		}

		allItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

		const result = { items: allItems, totalCount: allItems.length };
		setCache(cacheKey, result);
		return result;
	};

	const searchIssuesInMyRepos = async (query: string): Promise<GitHubSearchResult> => {
		return searchInMyRepos(query, 'issue');
	};

	const searchPullRequestsInMyRepos = async (query: string): Promise<GitHubSearchResult> => {
		return searchInMyRepos(query, 'pr');
	};

	return {
		setAuth,
		validateToken,
		getIssue,
		getPullRequest,
		searchIssues,
		searchPullRequests,
		searchIssuesInMyRepos,
		searchPullRequestsInMyRepos,
		getRecentIssues,
		parseGitHubUrl,
		getMetadataFromUrl,
		getUserRepositories,
		getAuthenticatedUser,
		getUserOrganizations,
		clearCache,
		clearCacheForUrl,
		isAuthenticated,
		getRateLimit
	};
}

interface GitHubIssueApiResponse {
	number: number;
	title: string;
	state: string;
	labels: Array<string | { name: string; color?: string }>;
	assignees?: Array<{ login: string }>;
	body: string | null;
	created_at: string;
	updated_at: string;
	html_url: string;
	pull_request?: { merged_at?: string };
	draft?: boolean;
	repository_url: string;
}

interface GitHubPullRequestApiResponse {
	number: number;
	title: string;
	state: string;
	labels: Array<string | { name: string; color?: string }>;
	assignees?: Array<{ login: string }>;
	body: string | null;
	created_at: string;
	updated_at: string;
	html_url: string;
	merged: boolean;
	draft: boolean;
}

interface GitHubSearchApiResponse {
	total_count: number;
	items: GitHubIssueApiResponse[];
}

interface GitHubRepoApiResponse {
	full_name: string;
	description: string | null;
	private: boolean;
}

interface GitHubUserApiResponse {
	login: string;
}

interface GitHubOrgApiResponse {
	login: string;
}

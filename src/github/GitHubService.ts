import { requestUrl, RequestUrlResponse } from 'obsidian';
import { GitHubAuth, GitHubIssueMetadata, GitHubLabel } from '../types';

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
	getIssue: (owner: string, repo: string, number: number) => Promise<GitHubIssueMetadata | undefined>;
	getPullRequest: (owner: string, repo: string, number: number) => Promise<GitHubIssueMetadata | undefined>;
	searchIssues: (query: string, repo?: string) => Promise<GitHubSearchResult>;
	searchPullRequests: (query: string, repo?: string) => Promise<GitHubSearchResult>;
	getRecentIssues: (repo?: string, limit?: number) => Promise<GitHubIssueMetadata[]>;
	parseGitHubUrl: (url: string) => ParsedGitHubUrl | undefined;
	getMetadataFromUrl: (url: string) => Promise<GitHubIssueMetadata | undefined>;
	clearCache: () => void;
	isAuthenticated: () => boolean;
}

const CACHE_TTL = 5 * 60 * 1000;
const API_BASE = 'https://api.github.com';

export function createGitHubService(): GitHubServiceInstance {
	let auth: GitHubAuth = { method: 'none' };
	const cache = new Map<string, CacheEntry<unknown>>();

	const setAuth = (newAuth: GitHubAuth): void => {
		auth = newAuth;
		cache.clear();
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

	const apiRequest = async <T>(endpoint: string): Promise<T | undefined> => {
		try {
			const response: RequestUrlResponse = await requestUrl({
				url: `${API_BASE}${endpoint}`,
				headers: getHeaders()
			});
			return response.json as T;
		} catch (error) {
			console.error('GitHub API error:', error);
			return undefined;
		}
	};

	const validateToken = async (): Promise<{ valid: boolean; username?: string; error?: string }> => {
		if (!isAuthenticated()) {
			return { valid: false, error: 'No token configured' };
		}
		try {
			const response = await requestUrl({
				url: `${API_BASE}/user`,
				headers: getHeaders()
			});
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

		const data = await apiRequest<GitHubIssueApiResponse>(`/repos/${owner}/${repo}/issues/${number}`);
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

		const data = await apiRequest<GitHubPullRequestApiResponse>(`/repos/${owner}/${repo}/pulls/${number}`);
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
			prStatus: data.merged ? 'merged' : data.draft ? 'draft' : data.state === 'closed' ? 'closed' : 'open'
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

	return {
		setAuth,
		validateToken,
		getIssue,
		getPullRequest,
		searchIssues,
		searchPullRequests,
		getRecentIssues,
		parseGitHubUrl,
		getMetadataFromUrl,
		clearCache,
		isAuthenticated
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

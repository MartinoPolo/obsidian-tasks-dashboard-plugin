import {
	GitHubIssueMetadata,
	GitHubRepoMetadata,
	GitHubRepository
} from '../types';
import { parseGitHubUrl } from '../utils/github-url';
import {
	GitHubIssueApiResponse,
	GitHubOrgApiResponse,
	GitHubPullRequestApiResponse,
	GitHubRepoApiResponse,
	GitHubRepoDetailApiResponse,
	GitHubSearchApiResponse,
	GitHubUserApiResponse
} from './github-api-types';
import {
	CACHE_TTL_MS,
	FALLBACK_SEARCH_PER_PAGE,
	MAX_CACHE_SIZE,
	MAX_PARALLEL_ORG_QUERIES,
	SEARCH_RESULTS_PER_PAGE,
	USER_REPOS_PER_PAGE
} from './github-service-constants';
import { createGitHubCacheStore } from './github-service-cache';
import {
	mapIssueResponse,
	mapPullRequestResponse,
	mapSearchItems
} from './github-service-mappers';
import { createGitHubRequestClient } from './github-service-request';
import {
	buildIssueSearchEndpoint,
	createEmptySearchResult,
	getIssueCacheKey,
	uniqueByUrl
} from './github-service-search-helpers';
import { GitHubSearchResult, GitHubServiceInstance } from './github-service-types';

export { GitHubApiError } from './github-service-types';
export type { GitHubApiErrorKind, GitHubServiceInstance } from './github-service-types';

export function createGitHubService(): GitHubServiceInstance {
	const requestClient = createGitHubRequestClient();
	const cacheStore = createGitHubCacheStore(CACHE_TTL_MS, MAX_CACHE_SIZE);

	const clearCache = (): void => {
		cacheStore.clear();
	};

	const setAuth: GitHubServiceInstance['setAuth'] = (newAuth): void => {
		requestClient.setAuth(newAuth);
		cacheStore.clear();
	};

	const isAuthenticated = (): boolean => {
		return requestClient.isAuthenticated();
	};

	const getRateLimit = () => {
		return requestClient.getRateLimit();
	};

	const validateToken: GitHubServiceInstance['validateToken'] = async () => {
		return requestClient.validateToken();
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
		cacheStore.delete(cacheKeyPrefix);
	};

	const getIssue = async (
		owner: string,
		repo: string,
		number: number
	): Promise<GitHubIssueMetadata | undefined> => {
		const cacheKey = getIssueCacheKey('issue', owner, repo, number);
		return cacheStore.getOrLoadOptional(cacheKey, async () => {
			const data = await requestClient.apiRequest<GitHubIssueApiResponse>(
				`/repos/${owner}/${repo}/issues/${number}`
			);
			if (data === undefined) {
				return undefined;
			}

			return mapIssueResponse(data, owner, repo);
		});
	};

	const getPullRequest = async (
		owner: string,
		repo: string,
		number: number
	): Promise<GitHubIssueMetadata | undefined> => {
		const cacheKey = getIssueCacheKey('pr', owner, repo, number);
		return cacheStore.getOrLoadOptional(cacheKey, async () => {
			const data = await requestClient.apiRequest<GitHubPullRequestApiResponse>(
				`/repos/${owner}/${repo}/pulls/${number}`
			);
			if (data === undefined) {
				return undefined;
			}

			return mapPullRequestResponse(data, owner, repo);
		});
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

	const normalizeSearchQuery = (query: string): string => {
		return query.trim().replace(/\s+/g, ' ');
	};

	const buildTextQuery = (query: string): string => {
		const normalizedQuery = normalizeSearchQuery(query);
		if (normalizedQuery === '') {
			return normalizedQuery;
		}

		return `${normalizedQuery} in:title,body`;
	};

	const searchItems = async (
		query: string,
		repo: string | undefined,
		type: 'issue' | 'pr'
	): Promise<GitHubSearchResult> => {
		if (!isAuthenticated()) {
			return createEmptySearchResult();
		}

		let searchQuery = buildTextQuery(query);
		if (repo !== undefined && repo !== '') {
			searchQuery = `repo:${repo} ${searchQuery}`.trim();
		}
		searchQuery = `${searchQuery} is:${type}`;

		const cacheKey = `search:${type === 'issue' ? 'issues' : 'pr'}:${searchQuery}`;
		const cached = cacheStore.get<GitHubSearchResult>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const data = await requestClient.apiRequest<GitHubSearchApiResponse>(
			buildIssueSearchEndpoint(searchQuery, SEARCH_RESULTS_PER_PAGE)
		);

		if (data === undefined) {
			return createEmptySearchResult();
		}

		const items = mapSearchItems(data.items);

		const result = { items, totalCount: data.total_count };
		cacheStore.set(cacheKey, result);
		return result;
	};

	const searchIssues = async (query: string, repo?: string): Promise<GitHubSearchResult> => {
		return searchItems(query, repo, 'issue');
	};

	const searchPullRequests = async (
		query: string,
		repo?: string
	): Promise<GitHubSearchResult> => {
		return searchItems(query, repo, 'pr');
	};

	const getRecentIssues = async (repo?: string, limit = 10): Promise<GitHubIssueMetadata[]> => {
		if (!isAuthenticated()) {
			return [];
		}

		if (repo !== undefined && repo !== '') {
			const cacheKey = `recent:${repo}:${limit}`;
			const cached = cacheStore.get<GitHubIssueMetadata[]>(cacheKey);
			if (cached !== undefined) {
				return cached;
			}

			const [owner, repoName] = repo.split('/');
			const data = await requestClient.apiRequest<GitHubIssueApiResponse[]>(
				`/repos/${owner}/${repoName}/issues?state=all&per_page=${limit}&sort=updated`
			);

			if (data === undefined) {
				return [];
			}

			const items = data.map((item) => mapIssueResponse(item, owner, repoName));
			cacheStore.set(cacheKey, items);
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
		return cacheStore.getOrLoad(cacheKey, async () => {
			const data = await requestClient.apiRequest<GitHubRepoApiResponse[]>(
				`/user/repos?sort=pushed&per_page=${USER_REPOS_PER_PAGE}&type=all`
			);
			if (data === undefined) {
				return [];
			}

			return data.map((repo) => ({
				fullName: repo.full_name,
				description: repo.description ?? '',
				isPrivate: repo.private
			}));
		});
	};

	const getRepository = async (
		owner: string,
		repo: string
	): Promise<GitHubRepoMetadata | undefined> => {
		const cacheKey = `repo:${owner}/${repo}`;
		return cacheStore.getOrLoadOptional(cacheKey, async () => {
			const data = await requestClient.apiRequest<GitHubRepoDetailApiResponse>(
				`/repos/${owner}/${repo}`
			);
			if (data === undefined) {
				return undefined;
			}

			const metadata: GitHubRepoMetadata = {
				fullName: data.full_name,
				owner,
				repo,
				description: data.description ?? '',
				url: data.html_url,
				stars: data.stargazers_count,
				language: data.language ?? '',
				forksCount: data.forks_count,
				openIssuesCount: data.open_issues_count,
				isPrivate: data.private,
				updatedAt: data.updated_at
			};

			return metadata;
		});
	};

	const getAuthenticatedUser = async (): Promise<string | undefined> => {
		if (!isAuthenticated()) {
			return undefined;
		}

		const cacheKey = 'user:profile';
		return cacheStore.getOrLoadOptional(cacheKey, async () => {
			const data = await requestClient.apiRequest<GitHubUserApiResponse>('/user');
			if (data === undefined) {
				return undefined;
			}

			return data.login;
		});
	};

	const getUserOrganizations = async (): Promise<string[]> => {
		if (!isAuthenticated()) {
			return [];
		}

		const cacheKey = 'user:orgs';
		return cacheStore.getOrLoad(cacheKey, async () => {
			const data = await requestClient.apiRequest<GitHubOrgApiResponse[]>('/user/orgs');
			if (data === undefined) {
				return [];
			}

			return data.map((org) => org.login);
		});
	};

	const searchInMyRepos = async (
		query: string,
		issueType: 'issue' | 'pr'
	): Promise<GitHubSearchResult> => {
		if (!isAuthenticated()) {
			return createEmptySearchResult();
		}

		const cacheKey = `search:my-repos:${issueType}:${query}`;
		const cached = cacheStore.get<GitHubSearchResult>(cacheKey);
		if (cached !== undefined) {
			return cached;
		}

		const repositories = await getUserRepositories();
		if (repositories.length === 0) {
			return createEmptySearchResult();
		}

		const allowedRepositories = new Set(
			repositories.map((repository) => repository.fullName.toLowerCase())
		);

		const typeQualifier = issueType === 'issue' ? 'is:issue' : 'is:pr';
		const textQuery = buildTextQuery(query);
		let allItems: GitHubIssueMetadata[];
		const searchQuery = `${textQuery} ${typeQualifier}`.trim();
		const data = await requestClient.apiRequest<GitHubSearchApiResponse>(
			buildIssueSearchEndpoint(searchQuery, FALLBACK_SEARCH_PER_PAGE)
		);

		if (data === undefined) {
			return createEmptySearchResult();
		}

		allItems = mapSearchItems(data.items).filter((item) => {
			return allowedRepositories.has(item.repository.toLowerCase());
		});

		if (allItems.length === 0 && repositories.length <= MAX_PARALLEL_ORG_QUERIES) {
			const repoQualifiedQueries = repositories.map((repository) => {
				return `repo:${repository.fullName} ${textQuery} ${typeQualifier}`.trim();
			});

			const repoSearchResults = await Promise.all(
				repoQualifiedQueries.map((repoQuery) => {
					return requestClient.apiRequest<GitHubSearchApiResponse>(
						buildIssueSearchEndpoint(repoQuery, SEARCH_RESULTS_PER_PAGE)
					);
				})
			);

			allItems = [];
			for (const repoData of repoSearchResults) {
				if (repoData === undefined) {
					continue;
				}
				allItems.push(...mapSearchItems(repoData.items));
			}

			allItems = uniqueByUrl(allItems);
		}

		allItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

		const result = { items: allItems, totalCount: allItems.length };
		cacheStore.set(cacheKey, result);
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
		getRepository,
		getAuthenticatedUser,
		getUserOrganizations,
		clearCache,
		clearCacheForUrl,
		isAuthenticated,
		getRateLimit
	};
}

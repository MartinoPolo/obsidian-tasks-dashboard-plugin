import { GitHubIssueMetadata } from '../types';
import { GitHubSearchResult } from './github-service-types';

export const createEmptySearchResult = (): GitHubSearchResult => {
	return { items: [], totalCount: 0 };
};

export const getIssueCacheKey = (
	type: 'issue' | 'pr',
	owner: string,
	repo: string,
	number: number
): string => {
	return `${type}:${owner}/${repo}#${number}`;
};

export const buildIssueSearchEndpoint = (searchQuery: string, perPage: number): string => {
	return `/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=${perPage}&sort=updated`;
};

export const parseRepoFromUrl = (repositoryUrl: string): { owner: string; repoName: string } => {
	const repoMatch = repositoryUrl.match(/repos\/([^/]+)\/([^/]+)$/);
	return repoMatch
		? { owner: repoMatch[1], repoName: repoMatch[2] }
		: { owner: '', repoName: '' };
};

export const uniqueByUrl = (items: GitHubIssueMetadata[]): GitHubIssueMetadata[] => {
	const seenUrls = new Set<string>();
	const uniqueItems: GitHubIssueMetadata[] = [];

	for (const item of items) {
		if (seenUrls.has(item.url)) {
			continue;
		}
		seenUrls.add(item.url);
		uniqueItems.push(item);
	}

	return uniqueItems;
};

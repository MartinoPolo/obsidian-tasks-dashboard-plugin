import { GitHubIssueMetadata, GitHubLabel } from '../types';
import {
	GitHubIssueApiResponse,
	GitHubPullRequestApiResponse
} from './github-api-types';
import { DEFAULT_LABEL_COLOR } from './github-service-constants';
import { GitHubIssueState } from './github-service-types';
import { parseRepoFromUrl } from './github-service-search-helpers';

export const normalizeIssueState = (state: string): GitHubIssueState => {
	return state === 'closed' ? 'closed' : 'open';
};

export const mapLabels = (
	labels: Array<string | { name: string; color?: string }>
): GitHubLabel[] => {
	return labels.map((label): GitHubLabel => {
		if (typeof label === 'string') {
			return { name: label, color: DEFAULT_LABEL_COLOR };
		}
		return {
			name: label.name,
			color: label.color !== undefined && label.color !== '' ? label.color : DEFAULT_LABEL_COLOR
		};
	});
};

export const mapIssueResponse = (
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
		state: normalizeIssueState(data.state),
		labels: mapLabels(data.labels),
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

export const mapPullRequestResponse = (
	data: GitHubPullRequestApiResponse,
	owner: string,
	repo: string
): GitHubIssueMetadata => {
	const prStatus: NonNullable<GitHubIssueMetadata['prStatus']> = data.merged
		? 'merged'
		: data.draft
			? 'draft'
			: data.state === 'closed'
				? 'closed'
				: 'open';

	return {
		number: data.number,
		title: data.title,
		state: normalizeIssueState(data.state),
		labels: mapLabels(data.labels),
		assignees: data.assignees !== undefined ? data.assignees.map((a) => a.login) : [],
		body: data.body !== null ? data.body : undefined,
		createdAt: data.created_at,
		updatedAt: data.updated_at,
		repository: `${owner}/${repo}`,
		url: data.html_url,
		isPR: true,
		prStatus
	};
};

export const mapSearchItems = (items: GitHubIssueApiResponse[]): GitHubIssueMetadata[] => {
	return items.map((item) => {
		const { owner, repoName } = parseRepoFromUrl(item.repository_url);
		return mapIssueResponse(item, owner, repoName);
	});
};

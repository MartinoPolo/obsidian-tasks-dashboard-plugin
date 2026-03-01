export type GitHubIssueState = 'open' | 'closed';

export interface GitHubLabelObjectApiResponse {
	name: string;
	color?: string;
}

export type GitHubLabelApiResponse = string | GitHubLabelObjectApiResponse;

export interface GitHubAssigneeApiResponse {
	login: string;
}

interface GitHubIssueLikeApiResponse {
	number: number;
	title: string;
	state: GitHubIssueState;
	labels: GitHubLabelApiResponse[];
	assignees?: GitHubAssigneeApiResponse[];
	body: string | null;
	created_at: string;
	updated_at: string;
	html_url: string;
}

export interface GitHubIssueApiResponse extends GitHubIssueLikeApiResponse {
	pull_request?: { merged_at?: string };
	draft?: boolean;
	repository_url: string;
}

export interface GitHubPullRequestApiResponse extends GitHubIssueLikeApiResponse {
	merged: boolean;
	draft: boolean;
}

export interface GitHubSearchApiResponse {
	total_count: number;
	items: GitHubIssueApiResponse[];
}

export interface GitHubRepoApiResponse {
	full_name: string;
	description: string | null;
	private: boolean;
}

export interface GitHubRepoDetailApiResponse {
	full_name: string;
	description: string | null;
	html_url: string;
	stargazers_count: number;
	language: string | null;
	forks_count: number;
	open_issues_count: number;
	private: boolean;
	updated_at: string;
}

interface GitHubActorApiResponse {
	login: string;
}

export interface GitHubUserApiResponse extends GitHubActorApiResponse {}

export interface GitHubOrgApiResponse extends GitHubActorApiResponse {}

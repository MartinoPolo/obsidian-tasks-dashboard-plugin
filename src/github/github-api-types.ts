export interface GitHubIssueApiResponse {
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

export interface GitHubPullRequestApiResponse {
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

export interface GitHubUserApiResponse {
	login: string;
}

export interface GitHubOrgApiResponse {
	login: string;
}

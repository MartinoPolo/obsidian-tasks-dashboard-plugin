export type BranchStatus = 'active' | 'local' | 'deleted' | 'unknown';
export type PrState = 'none' | 'draft' | 'open' | 'review-requested' | 'merged' | 'closed';
export type IssueState = 'open' | 'closed' | 'not_planned' | 'unknown';

export interface LinkedPullRequest {
	number: number;
	title: string;
	url: string;
	state: PrState;
	repository: string;
}

export interface LinkedGitHubIssue {
	number: number;
	title: string;
	url: string;
	state: IssueState;
	repository: string;
}

export interface IssueGitStatus {
	branchName: string | undefined;
	branchStatus: BranchStatus;
	baseBranch: string | undefined;
	linkedPullRequests: LinkedPullRequest[];
	linkedIssues: LinkedGitHubIssue[];
	aggregatePrState: PrState;
	fetchedAt: number;
}

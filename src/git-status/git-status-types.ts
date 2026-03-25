export type BranchStatus = 'active' | 'local' | 'remote-gone' | 'deleted' | 'unknown';
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
	behindBaseCount: number | undefined;
	mergeConflict: boolean | undefined;
	fetchedAt: number;
}

export const isFullyClosed = (status: IssueGitStatus): boolean => {
	const prClosed = status.aggregatePrState === 'merged' || status.aggregatePrState === 'closed';
	const branchGone = status.branchStatus === 'remote-gone' || status.branchStatus === 'deleted';
	const hasClosedGitHubIssue =
		status.linkedIssues.length > 0 &&
		status.linkedIssues.some(
			(issue) => issue.state === 'closed' || issue.state === 'not_planned'
		);
	return prClosed && branchGone && hasClosedGitHubIssue;
};

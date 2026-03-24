import type { IconName } from '../components/icons/index';
import type { BranchStatus, IssueState, PrState } from './git-status-types';

export const PR_STATE_ICON: Record<PrState, IconName> = {
	// 'none' is only used for aggregatePrState (accent class); individual PRs always have a concrete state
	none: 'gitPrOpen',
	open: 'gitPrOpen',
	draft: 'gitPrDraft',
	merged: 'gitPrMerged',
	closed: 'gitPrClosed',
	'review-requested': 'gitPrReviewRequested'
};

export const PR_STATE_CSS_CLASS: Record<PrState, string> = {
	none: '',
	open: 'tdc-git-badge-open',
	draft: 'tdc-git-badge-draft',
	merged: 'tdc-git-badge-merged',
	closed: 'tdc-git-badge-closed',
	'review-requested': 'tdc-git-badge-review'
};

export const PR_STATE_LABEL: Record<PrState, string> = {
	none: '',
	open: 'Open',
	draft: 'Draft',
	merged: 'Merged',
	closed: 'Closed',
	'review-requested': 'Review'
};

export const ISSUE_STATE_ICON: Record<IssueState, IconName> = {
	open: 'gitIssueOpen',
	closed: 'gitIssueClosed',
	not_planned: 'gitIssueNotPlanned',
	// 'unknown' is never produced by mapIssueState; exists as type-safety fallback
	unknown: 'gitIssueOpen'
};

export const ISSUE_STATE_CSS_CLASS: Record<IssueState, string> = {
	open: 'tdc-git-badge-issue-open',
	closed: 'tdc-git-badge-issue-closed',
	not_planned: 'tdc-git-badge-issue-not-planned',
	unknown: ''
};

export const ISSUE_STATE_LABEL: Record<IssueState, string> = {
	open: 'Open',
	closed: 'Closed',
	not_planned: 'Not Planned',
	unknown: ''
};

export const BRANCH_STATUS_ICON: Record<BranchStatus, IconName> = {
	active: 'gitBranchActive',
	local: 'gitBranchLocal',
	'remote-gone': 'gitBranchRemoteGone',
	deleted: 'gitBranchDeleted',
	unknown: 'gitBranchUnknown'
};

export const BRANCH_STATUS_CSS_CLASS: Record<BranchStatus, string> = {
	active: 'tdc-git-badge-branch-active',
	local: 'tdc-git-badge-branch-local',
	'remote-gone': 'tdc-git-badge-branch-remote-gone',
	deleted: 'tdc-git-badge-branch-deleted',
	unknown: 'tdc-git-badge-branch-unknown'
};

export const BRANCH_STATUS_TOOLTIP_PREFIX: Record<BranchStatus, string> = {
	active: 'Branch exists',
	local: 'Branch local only (not pushed)',
	'remote-gone': 'Remote branch deleted',
	deleted: 'Branch deleted',
	unknown: 'Branch status unknown'
};

export const BRANCH_NAME_MAX_DISPLAY_LENGTH = 16;

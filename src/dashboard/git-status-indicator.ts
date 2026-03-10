import { setTooltip } from 'obsidian';
import type {
	IssueGitStatus,
	IssueState,
	LinkedGitHubIssue,
	LinkedPullRequest,
	PrState
} from '../git-status/git-status-types';
import { appendInlineSvgIcon, ICONS } from './header-actions';

const PR_STATE_ICON: Record<PrState, string> = {
	none: ICONS.gitPrOpen,
	open: ICONS.gitPrOpen,
	draft: ICONS.gitPrDraft,
	merged: ICONS.gitPrMerged,
	closed: ICONS.gitPrClosed,
	'review-requested': ICONS.gitPrOpen
};

const PR_STATE_CSS_CLASS: Record<PrState, string> = {
	none: '',
	open: 'tdc-git-badge-open',
	draft: 'tdc-git-badge-draft',
	merged: 'tdc-git-badge-merged',
	closed: 'tdc-git-badge-closed',
	'review-requested': 'tdc-git-badge-review'
};

const PR_STATE_LABEL: Record<PrState, string> = {
	none: '',
	open: 'Open',
	draft: 'Draft',
	merged: 'Merged',
	closed: 'Closed',
	'review-requested': 'Review'
};

const ISSUE_STATE_ICON: Record<IssueState, string> = {
	open: ICONS.gitIssueOpen,
	closed: ICONS.gitIssueClosed,
	not_planned: ICONS.gitIssueNotPlanned,
	unknown: ICONS.gitIssueOpen
};

const ISSUE_STATE_CSS_CLASS: Record<IssueState, string> = {
	open: 'tdc-git-badge-issue-open',
	closed: 'tdc-git-badge-issue-closed',
	not_planned: 'tdc-git-badge-issue-not-planned',
	unknown: ''
};

const ISSUE_STATE_LABEL: Record<IssueState, string> = {
	open: 'Open',
	closed: 'Closed',
	not_planned: 'Not Planned',
	unknown: ''
};

const BRANCH_NAME_MAX_DISPLAY_LENGTH = 16;

export function renderBranchBadge(container: HTMLElement, status: IssueGitStatus): void {
	if (status.branchName === undefined) {
		return;
	}

	const branchStatusClass =
		status.branchStatus === 'active'
			? 'tdc-git-badge-branch-active'
			: status.branchStatus === 'deleted'
				? 'tdc-git-badge-branch-deleted'
				: 'tdc-git-badge-branch-unknown';

	const badge = container.createSpan({
		cls: `tdc-git-badge ${branchStatusClass}`
	});
	appendInlineSvgIcon(badge, ICONS.gitBranch);

	const displayName =
		status.branchName.length > BRANCH_NAME_MAX_DISPLAY_LENGTH
			? status.branchName.slice(0, BRANCH_NAME_MAX_DISPLAY_LENGTH) + '\u2026'
			: status.branchName;
	badge.appendText(displayName);

	const tooltipText =
		status.branchStatus === 'active'
			? `Branch exists: ${status.branchName}`
			: status.branchStatus === 'deleted'
				? `Branch deleted: ${status.branchName}`
				: `Branch status unknown: ${status.branchName}`;
	setTooltip(badge, tooltipText, { delay: 300 });
}

export function renderPrBadge(container: HTMLElement, pr: LinkedPullRequest): void {
	const cssClass = PR_STATE_CSS_CLASS[pr.state];
	const badge = container.createEl('a', {
		cls: `tdc-git-badge ${cssClass}`,
		href: pr.url,
		attr: { target: '_blank', rel: 'noopener noreferrer' }
	});
	badge.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	const icon = PR_STATE_ICON[pr.state];
	appendInlineSvgIcon(badge, icon);
	badge.appendText(`#${pr.number} ${PR_STATE_LABEL[pr.state]}`);

	setTooltip(badge, `${pr.title} — ${pr.state}`, { delay: 300 });
}

export function renderIssueBadge(container: HTMLElement, issue: LinkedGitHubIssue): void {
	const cssClass = ISSUE_STATE_CSS_CLASS[issue.state];
	const badge = container.createEl('a', {
		cls: `tdc-git-badge ${cssClass}`,
		href: issue.url,
		attr: { target: '_blank', rel: 'noopener noreferrer' }
	});
	badge.addEventListener('click', (event) => {
		event.stopPropagation();
	});

	const icon = ISSUE_STATE_ICON[issue.state];
	appendInlineSvgIcon(badge, icon);

	const stateLabel = ISSUE_STATE_LABEL[issue.state];
	const labelText = stateLabel !== '' ? `#${issue.number} ${stateLabel}` : `#${issue.number}`;
	badge.appendText(labelText);

	setTooltip(badge, `${issue.title} — ${issue.state}`, { delay: 300 });
}

export function applyPrStateAccent(issueContainer: HTMLElement, prState: PrState): void {
	// Remove any existing accent classes
	for (const cls of Array.from(issueContainer.classList)) {
		if (cls.startsWith('tdc-pr-accent-')) {
			issueContainer.classList.remove(cls);
		}
	}

	if (prState === 'none') {
		return;
	}

	issueContainer.classList.add(`tdc-pr-accent-${prState}`);
}

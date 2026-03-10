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
			: status.branchStatus === 'local'
				? 'tdc-git-badge-branch-local'
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
	badge.createSpan({ text: displayName });

	const tooltipText =
		status.branchStatus === 'active'
			? `Branch exists: ${status.branchName}`
			: status.branchStatus === 'local'
				? `Branch local only (not pushed): ${status.branchName}`
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
	badge.createSpan({ text: `#${pr.number} ${PR_STATE_LABEL[pr.state]}` });

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
	badge.createSpan({ text: labelText });

	setTooltip(badge, `${issue.title} — ${issue.state}`, { delay: 300 });
}

export function showBadgeContextMenu(event: MouseEvent, onRefresh: () => void): void {
	event.preventDefault();
	event.stopPropagation();

	const dropdown = document.createElement('div');
	dropdown.className = 'tdc-sort-dropdown tdc-sort-dropdown-portal';
	document.body.appendChild(dropdown);

	const refreshItem = dropdown.createDiv({ cls: 'tdc-sort-dropdown-item', text: 'Refresh' });

	const removeDropdown = (): void => {
		document.removeEventListener('click', handleOutsideClick, true);
		document.removeEventListener('keydown', handleEscape, true);
		dropdown.remove();
	};

	refreshItem.addEventListener('click', (clickEvent) => {
		clickEvent.preventDefault();
		clickEvent.stopPropagation();
		removeDropdown();
		onRefresh();
	});

	const handleOutsideClick = (outsideEvent: MouseEvent): void => {
		const target = outsideEvent.target;
		if (target instanceof Node && dropdown.contains(target)) {
			return;
		}
		removeDropdown();
	};

	const handleEscape = (keyEvent: KeyboardEvent): void => {
		if (keyEvent.key !== 'Escape') {
			return;
		}
		keyEvent.preventDefault();
		keyEvent.stopPropagation();
		removeDropdown();
	};

	// Position at click location
	const viewportPadding = 8;
	dropdown.style.left = `${Math.max(viewportPadding, event.clientX)}px`;
	dropdown.style.top = `${Math.max(viewportPadding, event.clientY)}px`;

	document.addEventListener('click', handleOutsideClick, true);
	document.addEventListener('keydown', handleEscape, true);
}

export function applyPrStateAccent(headerElement: HTMLElement, prState: PrState): void {
	// Remove any existing accent classes
	for (const cls of Array.from(headerElement.classList)) {
		if (cls.startsWith('tdc-pr-accent-')) {
			headerElement.classList.remove(cls);
		}
	}

	if (prState === 'none') {
		return;
	}

	headerElement.classList.add(`tdc-pr-accent-${prState}`);
}

import { GitHubIssueMetadata, GitHubDisplayMode } from '../types';
import { parseGitHubUrlInfo } from '../utils/github';

const ICONS = {
	refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>`,
	pr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>`,
	issue: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
	externalLink: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`
};

export interface GitHubCardRendererInstance {
	render: (
		container: HTMLElement,
		metadata: GitHubIssueMetadata,
		displayMode: GitHubDisplayMode,
		onRefresh: () => void
	) => void;
	renderLoading: (container: HTMLElement) => void;
	renderError: (container: HTMLElement, message: string) => void;
	renderSimpleLink: (container: HTMLElement, url: string) => void;
}

function formatGitHubSimpleLinkText(url: string): string {
	const parsed = parseGitHubUrlInfo(url);
	if (parsed === undefined) {
		return 'GitHub Issue';
	}
	const type = parsed.type === 'pr' ? 'PR' : 'Issue';
	return `GitHub ${type} #${parsed.number}`;
}

export function createGitHubCardRenderer(): GitHubCardRendererInstance {
	const getStateClass = (metadata: GitHubIssueMetadata): string => {
		if (metadata.isPR) {
			if (metadata.prStatus === 'merged') {
				return 'tdc-gh-state-merged';
			}
			if (metadata.prStatus === 'draft') {
				return 'tdc-gh-state-draft';
			}
		}
		return metadata.state === 'open' ? 'tdc-gh-state-open' : 'tdc-gh-state-closed';
	};

	const getStateText = (metadata: GitHubIssueMetadata): string => {
		if (metadata.isPR) {
			if (metadata.prStatus === 'merged') {
				return 'Merged';
			}
			if (metadata.prStatus === 'draft') {
				return 'Draft';
			}
		}
		return metadata.state === 'open' ? 'Open' : 'Closed';
	};

	const truncateText = (text: string, maxLength: number): string => {
		if (text.length <= maxLength) {
			return text;
		}
		return text.substring(0, maxLength).trim() + '...';
	};

	const renderMinimal = (
		container: HTMLElement,
		metadata: GitHubIssueMetadata,
		onRefresh: () => void
	): void => {
		const card = container.createDiv({ cls: 'tdc-gh-card tdc-gh-card-minimal' });

		const link = card.createEl('a', {
			cls: 'tdc-gh-link',
			href: metadata.url
		});
		link.setAttribute('target', '_blank');

		const icon = metadata.isPR ? ICONS.pr : ICONS.issue;
		link.innerHTML = icon;
		link.createSpan({ text: `#${metadata.number}` });

		card.createSpan({
			cls: `tdc-gh-state ${getStateClass(metadata)}`,
			text: getStateText(metadata)
		});

		const refreshBtn = card.createEl('button', {
			cls: 'tdc-gh-refresh',
			attr: { 'aria-label': 'Refresh GitHub data' }
		});
		refreshBtn.innerHTML = ICONS.refresh;
		refreshBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			onRefresh();
		});
	};

	const renderCompact = (
		container: HTMLElement,
		metadata: GitHubIssueMetadata,
		onRefresh: () => void
	): void => {
		const card = container.createDiv({ cls: 'tdc-gh-card tdc-gh-card-compact' });

		const header = card.createDiv({ cls: 'tdc-gh-header' });

		const link = header.createEl('a', {
			cls: 'tdc-gh-link',
			href: metadata.url
		});
		link.setAttribute('target', '_blank');

		const icon = metadata.isPR ? ICONS.pr : ICONS.issue;
		link.innerHTML = icon;
		link.createSpan({ cls: 'tdc-gh-number', text: `#${metadata.number}` });

		header.createSpan({
			cls: 'tdc-gh-title',
			text: truncateText(metadata.title, 60)
		});

		header.createSpan({
			cls: `tdc-gh-state ${getStateClass(metadata)}`,
			text: getStateText(metadata)
		});

		const refreshBtn = header.createEl('button', {
			cls: 'tdc-gh-refresh',
			attr: { 'aria-label': 'Refresh GitHub data' }
		});
		refreshBtn.innerHTML = ICONS.refresh;
		refreshBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			onRefresh();
		});

		if (metadata.labels.length > 0) {
			const labelsContainer = card.createDiv({ cls: 'tdc-gh-labels' });
			for (const label of metadata.labels.slice(0, 5)) {
				const labelEl = labelsContainer.createSpan({ cls: 'tdc-gh-label' });
				labelEl.style.backgroundColor = `#${label.color}`;
				labelEl.style.color = getContrastColor(label.color);
				labelEl.textContent = label.name;
			}
			if (metadata.labels.length > 5) {
				labelsContainer.createSpan({
					cls: 'tdc-gh-label-more',
					text: `+${metadata.labels.length - 5}`
				});
			}
		}

		if (metadata.body !== undefined && metadata.body !== '') {
			const preview = card.createDiv({ cls: 'tdc-gh-preview' });
			preview.textContent = truncateText(metadata.body.replace(/\r?\n/g, ' '), 100);
		}
	};

	const renderFull = (
		container: HTMLElement,
		metadata: GitHubIssueMetadata,
		onRefresh: () => void
	): void => {
		const card = container.createDiv({ cls: 'tdc-gh-card tdc-gh-card-full' });

		const header = card.createDiv({ cls: 'tdc-gh-header' });

		const link = header.createEl('a', {
			cls: 'tdc-gh-link',
			href: metadata.url
		});
		link.setAttribute('target', '_blank');

		const icon = metadata.isPR ? ICONS.pr : ICONS.issue;
		link.innerHTML = icon;
		link.createSpan({ cls: 'tdc-gh-number', text: `#${metadata.number}` });

		header.createSpan({
			cls: 'tdc-gh-title',
			text: metadata.title
		});

		header.createSpan({
			cls: `tdc-gh-state ${getStateClass(metadata)}`,
			text: getStateText(metadata)
		});

		const refreshBtn = header.createEl('button', {
			cls: 'tdc-gh-refresh',
			attr: { 'aria-label': 'Refresh GitHub data' }
		});
		refreshBtn.innerHTML = ICONS.refresh;
		refreshBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			onRefresh();
		});

		if (metadata.labels.length > 0) {
			const labelsContainer = card.createDiv({ cls: 'tdc-gh-labels' });
			for (const label of metadata.labels) {
				const labelEl = labelsContainer.createSpan({ cls: 'tdc-gh-label' });
				labelEl.style.backgroundColor = `#${label.color}`;
				labelEl.style.color = getContrastColor(label.color);
				labelEl.textContent = label.name;
			}
		}

		if (metadata.assignees.length > 0) {
			const assigneesContainer = card.createDiv({ cls: 'tdc-gh-assignees' });
			assigneesContainer.createSpan({ cls: 'tdc-gh-assignees-label', text: 'Assignees: ' });
			assigneesContainer.createSpan({
				text: metadata.assignees.map((a) => `@${a}`).join(', ')
			});
		}

		if (metadata.body !== undefined && metadata.body !== '') {
			const body = card.createDiv({ cls: 'tdc-gh-body' });
			body.textContent = truncateText(metadata.body.replace(/\r?\n/g, ' '), 200);
		}

		const footer = card.createDiv({ cls: 'tdc-gh-footer' });
		footer.createSpan({
			cls: 'tdc-gh-repo',
			text: metadata.repository
		});
		footer.createSpan({
			cls: 'tdc-gh-date',
			text: `Updated ${formatRelativeDate(metadata.updatedAt)}`
		});
	};

	const render = (
		container: HTMLElement,
		metadata: GitHubIssueMetadata,
		displayMode: GitHubDisplayMode,
		onRefresh: () => void
	): void => {
		container.empty();

		switch (displayMode) {
			case 'minimal':
				renderMinimal(container, metadata, onRefresh);
				break;
			case 'compact':
				renderCompact(container, metadata, onRefresh);
				break;
			case 'full':
				renderFull(container, metadata, onRefresh);
				break;
		}
	};

	const renderLoading = (container: HTMLElement): void => {
		container.empty();
		const loading = container.createDiv({ cls: 'tdc-gh-loading' });
		loading.createSpan({ text: 'Loading GitHub data...' });
	};

	const renderError = (container: HTMLElement, message: string): void => {
		container.empty();
		const error = container.createDiv({ cls: 'tdc-gh-error' });
		error.createSpan({ text: message });
	};

	const renderSimpleLink = (container: HTMLElement, url: string): void => {
		container.empty();
		const linkText = formatGitHubSimpleLinkText(url);
		const link = container.createEl('a', {
			cls: 'tdc-gh-simple-link',
			href: url,
			text: linkText
		});
		link.setAttribute('target', '_blank');
	};

	return { render, renderLoading, renderError, renderSimpleLink };
}

function getContrastColor(hexColor: string): string {
	const r = parseInt(hexColor.substring(0, 2), 16);
	const g = parseInt(hexColor.substring(2, 4), 16);
	const b = parseInt(hexColor.substring(4, 6), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.5 ? '#000000' : '#ffffff';
}

function formatRelativeDate(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		return 'today';
	}
	if (diffDays === 1) {
		return 'yesterday';
	}
	if (diffDays < 7) {
		return `${diffDays} days ago`;
	}
	if (diffDays < 30) {
		const weeks = Math.floor(diffDays / 7);
		return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
	}
	if (diffDays < 365) {
		const months = Math.floor(diffDays / 30);
		return `${months} month${months > 1 ? 's' : ''} ago`;
	}
	const years = Math.floor(diffDays / 365);
	return `${years} year${years > 1 ? 's' : ''} ago`;
}

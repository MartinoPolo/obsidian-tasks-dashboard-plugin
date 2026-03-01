import {
	GitHubIssueMetadata,
	GitHubRepoMetadata,
	GitHubDisplayMode,
	GitHubLabel
} from '../types';
import { parseGitHubUrlInfo } from '../utils/github';
import {
	getStateClass,
	getStateText,
	truncateText,
	formatRelativeDate,
	getContrastColor
} from '../utils/github-helpers';

const ICONS = {
	refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>`,
	unlink: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
	pr: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>`,
	issue: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
	repo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>`,
	star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
	fork: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/><path d="M12 12v3"/></svg>`
};

export interface GitHubCardRendererInstance {
	render: (
		container: HTMLElement,
		metadata: GitHubIssueMetadata,
		displayMode: GitHubDisplayMode,
		onRefresh: () => void,
		onUnlink?: () => void
	) => void;
	renderRepoCard: (
		container: HTMLElement,
		metadata: GitHubRepoMetadata,
		displayMode: GitHubDisplayMode,
		onRefresh: () => void,
		onUnlink?: () => void
	) => void;
	renderLoading: (container: HTMLElement) => void;
	renderError: (container: HTMLElement, message: string) => void;
	renderSimpleLink: (container: HTMLElement, url: string) => void;
}

function formatGitHubSimpleLinkText(url: string): string {
	const parsed = parseGitHubUrlInfo(url);
	if (parsed !== undefined) {
		const type = parsed.type === 'pr' ? 'PR' : 'Issue';
		return `GitHub ${type} #${parsed.number}`;
	}
	const repoMatch = url.match(/github\.com\/([^/]+\/[^/]+?)\/?$/);
	if (repoMatch !== null) {
		return repoMatch[1];
	}
	return 'GitHub Link';
}

function renderRefreshButton(parent: HTMLElement, onRefresh: () => void): void {
	const refreshBtn = parent.createEl('button', {
		cls: 'tdc-gh-refresh',
		attr: { 'aria-label': 'Refresh GitHub data' }
	});
	refreshBtn.innerHTML = ICONS.refresh;
	refreshBtn.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		onRefresh();
	});
}

function renderUnlinkButton(parent: HTMLElement, onUnlink: () => void): void {
	const unlinkBtn = parent.createEl('button', {
		cls: 'tdc-gh-unlink',
		attr: { 'aria-label': 'Remove GitHub link' }
	});
	unlinkBtn.innerHTML = ICONS.unlink;
	unlinkBtn.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		onUnlink();
	});
}

function renderCardActions(
	parent: HTMLElement,
	onRefresh: () => void,
	onUnlink?: () => void
): void {
	renderRefreshButton(parent, onRefresh);
	if (onUnlink !== undefined) {
		renderUnlinkButton(parent, onUnlink);
	}
}

function renderLabels(container: HTMLElement, labels: GitHubLabel[], maxCount?: number): void {
	if (labels.length === 0) {
		return;
	}

	const labelsContainer = container.createDiv({ cls: 'tdc-gh-labels' });
	const displayLabels = maxCount !== undefined ? labels.slice(0, maxCount) : labels;

	for (const label of displayLabels) {
		const labelEl = labelsContainer.createSpan({ cls: 'tdc-gh-label' });
		labelEl.style.backgroundColor = `#${label.color}`;
		labelEl.style.color = getContrastColor(label.color);
		labelEl.textContent = label.name;
	}

	if (maxCount !== undefined && labels.length > maxCount) {
		labelsContainer.createSpan({
			cls: 'tdc-gh-label-more',
			text: `+${labels.length - maxCount}`
		});
	}
}

interface IssueHeaderOptions {
	titleMaxLength?: number;
}

function renderIssueHeader(
	container: HTMLElement,
	metadata: GitHubIssueMetadata,
	options: IssueHeaderOptions = {}
): HTMLElement {
	const header = container.createDiv({ cls: 'tdc-gh-header' });

	const link = createExternalLink(header, 'tdc-gh-link', metadata.url);

	link.innerHTML = getIssueIcon(metadata.isPR);
	link.createSpan({ cls: 'tdc-gh-number', text: `#${metadata.number}` });

	const titleText =
		options.titleMaxLength !== undefined
			? truncateText(metadata.title, options.titleMaxLength)
			: metadata.title;

	header.createSpan({
		cls: 'tdc-gh-title',
		text: titleText
	});

	header.createSpan({
		cls: `tdc-gh-state tdc-gh-state-${getStateClass(metadata)}`,
		text: getStateText(metadata)
	});

	return header;
}

function renderRepoHeader(container: HTMLElement, metadata: GitHubRepoMetadata): HTMLElement {
	const header = container.createDiv({ cls: 'tdc-gh-header' });

	const link = createExternalLink(header, 'tdc-gh-link', metadata.url);
	link.innerHTML = ICONS.repo;
	link.createSpan({ cls: 'tdc-gh-repo-name', text: metadata.fullName });

	header.createSpan({
		cls: `tdc-gh-state ${metadata.isPrivate ? 'tdc-gh-state-closed' : 'tdc-gh-state-open'}`,
		text: metadata.isPrivate ? 'Private' : 'Public'
	});

	return header;
}

function createExternalLink(parent: HTMLElement, cls: string, href: string): HTMLAnchorElement {
	const link = parent.createEl('a', { cls, href });
	link.setAttribute('target', '_blank');
	return link;
}

function getIssueIcon(isPullRequest: boolean): string {
	return isPullRequest ? ICONS.pr : ICONS.issue;
}

function hasContent(text: string | undefined): text is string {
	return text !== undefined && text !== '';
}

function renderTextSection(
	container: HTMLElement,
	className: string,
	text: string,
	maxLength: number,
	collapseNewlines: boolean
): void {
	const section = container.createDiv({ cls: className });
	const content = collapseNewlines ? text.replace(/\r?\n/g, ' ') : text;
	section.textContent = truncateText(content, maxLength);
}

function renderUpdatedFooter(
	container: HTMLElement,
	repositoryName: string,
	updatedAt: string
): void {
	const footer = container.createDiv({ cls: 'tdc-gh-footer' });
	footer.createSpan({
		cls: 'tdc-gh-repo',
		text: repositoryName
	});
	footer.createSpan({
		cls: 'tdc-gh-date',
		text: `Updated ${formatRelativeDate(updatedAt)}`
	});
}

function formatStarCount(count: number): string {
	if (count >= 1000) {
		return `${(count / 1000).toFixed(1)}k`;
	}
	return count.toString();
}

function renderRepoIconStat(parent: HTMLElement, iconSvg: string, valueText: string): void {
	const statSpan = parent.createSpan({ cls: 'tdc-gh-repo-stat' });
	statSpan.innerHTML = iconSvg;
	statSpan.createSpan({ text: valueText });
}

type RenderByMode<TMetadata> = {
	[Mode in GitHubDisplayMode]: (
		container: HTMLElement,
		metadata: TMetadata,
		onRefresh: () => void,
		onUnlink?: () => void
	) => void;
};

function renderByDisplayMode<TMetadata>(
	renderers: RenderByMode<TMetadata>,
	container: HTMLElement,
	metadata: TMetadata,
	displayMode: GitHubDisplayMode,
	onRefresh: () => void,
	onUnlink?: () => void
): void {
	container.empty();
	renderers[displayMode](container, metadata, onRefresh, onUnlink);
}

export function createGitHubCardRenderer(): GitHubCardRendererInstance {
	const renderMinimal = (
		container: HTMLElement,
		metadata: GitHubIssueMetadata,
		onRefresh: () => void,
		onUnlink?: () => void
	): void => {
		const card = container.createDiv({ cls: 'tdc-gh-card tdc-gh-card-minimal' });

		const link = createExternalLink(card, 'tdc-gh-link', metadata.url);

		link.innerHTML = getIssueIcon(metadata.isPR);
		link.createSpan({ text: `#${metadata.number}` });

		card.createSpan({
			cls: `tdc-gh-state tdc-gh-state-${getStateClass(metadata)}`,
			text: getStateText(metadata)
		});

		renderCardActions(card, onRefresh, onUnlink);
	};

	const renderCompact = (
		container: HTMLElement,
		metadata: GitHubIssueMetadata,
		onRefresh: () => void,
		onUnlink?: () => void
	): void => {
		const card = container.createDiv({ cls: 'tdc-gh-card tdc-gh-card-compact' });

		const header = renderIssueHeader(card, metadata, { titleMaxLength: 60 });
		renderCardActions(header, onRefresh, onUnlink);

		renderLabels(card, metadata.labels, 5);

		if (hasContent(metadata.body)) {
			renderTextSection(card, 'tdc-gh-preview', metadata.body, 100, true);
		}
	};

	const renderFull = (
		container: HTMLElement,
		metadata: GitHubIssueMetadata,
		onRefresh: () => void,
		onUnlink?: () => void
	): void => {
		const card = container.createDiv({ cls: 'tdc-gh-card tdc-gh-card-full' });

		const header = renderIssueHeader(card, metadata);
		renderCardActions(header, onRefresh, onUnlink);

		renderLabels(card, metadata.labels);

		if (metadata.assignees.length > 0) {
			const assigneesContainer = card.createDiv({ cls: 'tdc-gh-assignees' });
			assigneesContainer.createSpan({ cls: 'tdc-gh-assignees-label', text: 'Assignees: ' });
			assigneesContainer.createSpan({
				text: metadata.assignees.map((a) => `@${a}`).join(', ')
			});
		}

		if (hasContent(metadata.body)) {
			renderTextSection(card, 'tdc-gh-body', metadata.body, 200, true);
		}

		renderUpdatedFooter(card, metadata.repository, metadata.updatedAt);
	};

	const render = (
		container: HTMLElement,
		metadata: GitHubIssueMetadata,
		displayMode: GitHubDisplayMode,
		onRefresh: () => void,
		onUnlink?: () => void
	): void => {
		renderByDisplayMode(
			{
				minimal: renderMinimal,
				compact: renderCompact,
				full: renderFull
			},
			container,
			metadata,
			displayMode,
			onRefresh,
			onUnlink
		);
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
		createExternalLink(container, 'tdc-gh-simple-link', url).textContent = linkText;
	};

	const renderRepoStats = (
		container: HTMLElement,
		metadata: GitHubRepoMetadata,
		includeOpenIssues: boolean
	): void => {
		const statsContainer = container.createDiv({ cls: 'tdc-gh-repo-stats' });

		if (metadata.stars > 0) {
			renderRepoIconStat(statsContainer, ICONS.star, formatStarCount(metadata.stars));
		}

		if (metadata.forksCount > 0) {
			renderRepoIconStat(statsContainer, ICONS.fork, metadata.forksCount.toString());
		}

		if (metadata.language !== '') {
			statsContainer.createSpan({
				cls: 'tdc-gh-repo-stat tdc-gh-repo-language',
				text: metadata.language
			});
		}

		if (includeOpenIssues && metadata.openIssuesCount > 0) {
			statsContainer.createSpan({
				cls: 'tdc-gh-repo-stat',
				text: `${metadata.openIssuesCount} open issues`
			});
		}
	};

	const renderRepoMinimal = (
		container: HTMLElement,
		metadata: GitHubRepoMetadata,
		onRefresh: () => void,
		onUnlink?: () => void
	): void => {
		const card = container.createDiv({
			cls: 'tdc-gh-card tdc-gh-card-minimal tdc-gh-card-repo'
		});

		const link = createExternalLink(card, 'tdc-gh-link', metadata.url);
		link.innerHTML = ICONS.repo;
		link.createSpan({ text: metadata.fullName });

		if (metadata.stars > 0) {
			const starSpan = card.createSpan({ cls: 'tdc-gh-repo-stars' });
			starSpan.innerHTML = ICONS.star;
			starSpan.createSpan({ text: formatStarCount(metadata.stars) });
		}

		renderCardActions(card, onRefresh, onUnlink);
	};

	const renderRepoCompact = (
		container: HTMLElement,
		metadata: GitHubRepoMetadata,
		onRefresh: () => void,
		onUnlink?: () => void
	): void => {
		const card = container.createDiv({
			cls: 'tdc-gh-card tdc-gh-card-compact tdc-gh-card-repo'
		});

		const header = renderRepoHeader(card, metadata);
		renderCardActions(header, onRefresh, onUnlink);

		renderRepoStats(card, metadata, false);

		if (metadata.description !== '') {
			renderTextSection(card, 'tdc-gh-preview', metadata.description, 100, false);
		}
	};

	const renderRepoFull = (
		container: HTMLElement,
		metadata: GitHubRepoMetadata,
		onRefresh: () => void,
		onUnlink?: () => void
	): void => {
		const card = container.createDiv({ cls: 'tdc-gh-card tdc-gh-card-full tdc-gh-card-repo' });

		const header = renderRepoHeader(card, metadata);
		renderCardActions(header, onRefresh, onUnlink);

		if (metadata.description !== '') {
			renderTextSection(card, 'tdc-gh-body', metadata.description, 200, false);
		}

		renderRepoStats(card, metadata, true);
		renderUpdatedFooter(card, metadata.fullName, metadata.updatedAt);
	};

	const renderRepoCard = (
		container: HTMLElement,
		metadata: GitHubRepoMetadata,
		displayMode: GitHubDisplayMode,
		onRefresh: () => void,
		onUnlink?: () => void
	): void => {
		renderByDisplayMode(
			{
				minimal: renderRepoMinimal,
				compact: renderRepoCompact,
				full: renderRepoFull
			},
			container,
			metadata,
			displayMode,
			onRefresh,
			onUnlink
		);
	};

	return { render, renderRepoCard, renderLoading, renderError, renderSimpleLink };
}

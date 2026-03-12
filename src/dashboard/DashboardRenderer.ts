import { MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import { mount, unmount } from 'svelte';
import TasksDashboardPlugin from '../../main';
import IssueCard from '../components/dashboard/IssueCard.svelte';
import SortControls from '../components/dashboard/SortControls.svelte';
import AssignedIssuesSection from '../components/dashboard/AssignedIssuesSection.svelte';
import GitHubCardContainer from '../components/github/GitHubCardContainer.svelte';
import { parseGitHubNoteParams } from './dashboard-renderer-params';

export { ReactiveRenderChild } from './dashboard-reactive-render-child';

export interface DashboardRendererInstance {
	render: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void;
	renderSortButton: (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => void;
	renderGitHubNoteCard: (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) => void;
	renderAssignedIssuesSection: (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	) => void;
}

export function createDashboardRenderer(plugin: TasksDashboardPlugin): DashboardRendererInstance {
	const render = (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext): void => {
		const component = mount(IssueCard, {
			target: el,
			props: { plugin, source, ctx, containerElement: el }
		});
		const child = new MarkdownRenderChild(el);
		child.register(() => unmount(component));
		ctx.addChild(child);
	};

	const renderSortButton = (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): void => {
		el.empty();
		const component = mount(SortControls, {
			target: el,
			props: { plugin, source, containerElement: el }
		});
		const child = new MarkdownRenderChild(el);
		child.register(() => unmount(component));
		ctx.addChild(child);
	};

	const renderGitHubNoteCard = (
		source: string,
		el: HTMLElement,
		_ctx: MarkdownPostProcessorContext
	): void => {
		const params = parseGitHubNoteParams(source);
		if (params === undefined) {
			el.createEl('span', { text: 'Invalid GitHub block: missing URL', cls: 'tdc-error' });
			return;
		}

		if (params.dashboard !== undefined) {
			const dashboard = plugin.settings.dashboards.find((d) => d.id === params.dashboard);
			if (dashboard !== undefined && !dashboard.githubEnabled) {
				return;
			}
		}

		const container = el.createDiv({ cls: 'tdc-github-note-container' });
		const githubContainer = container.createDiv({ cls: 'tdc-github-container' });
		mount(GitHubCardContainer, {
			target: githubContainer,
			props: { plugin, githubUrl: params.url }
		});
	};

	const renderAssignedIssuesSection = (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): void => {
		const component = mount(AssignedIssuesSection, {
			target: el,
			props: { plugin, source }
		});
		const child = new MarkdownRenderChild(el);
		child.register(() => unmount(component));
		ctx.addChild(child);
	};

	return { render, renderSortButton, renderGitHubNoteCard, renderAssignedIssuesSection };
}

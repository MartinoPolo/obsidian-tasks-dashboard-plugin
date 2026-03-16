import { mount } from 'svelte';
import TasksDashboardPlugin from '../../main';
import IssueCard from '../components/dashboard/IssueCard.svelte';
import SortControls from '../components/dashboard/SortControls.svelte';
import AssignedIssuesSection from '../components/dashboard/AssignedIssuesSection.svelte';
import GitHubCardContainer from '../components/github/GitHubCardContainer.svelte';
import { parseGitHubNoteParams } from './dashboard-renderer-params';
import type { MountFunction } from './dashboard-reactive-render-child';

export { ReactiveRenderChild } from './dashboard-reactive-render-child';
export type { MountFunction } from './dashboard-reactive-render-child';

export interface DashboardRendererInstance {
	render: MountFunction;
	renderSortButton: MountFunction;
	renderGitHubNoteCard: MountFunction;
	renderAssignedIssuesSection: MountFunction;
}

export function createDashboardRenderer(plugin: TasksDashboardPlugin): DashboardRendererInstance {
	const render: MountFunction = (source, el, _ctx) => {
		return mount(IssueCard, {
			target: el,
			props: { plugin, source, containerElement: el }
		});
	};

	const renderSortButton: MountFunction = (source, el, _ctx) => {
		el.empty();
		return mount(SortControls, {
			target: el,
			props: { plugin, source, containerElement: el }
		});
	};

	const renderGitHubNoteCard: MountFunction = (source, el, _ctx) => {
		const params = parseGitHubNoteParams(source);
		if (params === undefined) {
			el.createEl('span', { text: 'Invalid GitHub block: missing URL', cls: 'tdc-error' });
			return undefined;
		}

		if (params.dashboard !== undefined) {
			const dashboard = plugin.settings.dashboards.find((d) => d.id === params.dashboard);
			if (dashboard !== undefined && !dashboard.githubEnabled) {
				return undefined;
			}
		}

		const container = el.createDiv({ cls: 'tdc-github-note-container' });
		const githubContainer = container.createDiv({ cls: 'tdc-github-container' });
		return mount(GitHubCardContainer, {
			target: githubContainer,
			props: { plugin, githubUrl: params.url }
		});
	};

	const renderAssignedIssuesSection: MountFunction = (source, el, _ctx) => {
		return mount(AssignedIssuesSection, {
			target: el,
			props: { plugin, source }
		});
	};

	return { render, renderSortButton, renderGitHubNoteCard, renderAssignedIssuesSection };
}

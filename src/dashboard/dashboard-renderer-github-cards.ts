import { mount } from 'svelte';
import TasksDashboardPlugin from '../../main';
import GitHubCardContainer from '../components/github/GitHubCardContainer.svelte';
import { DashboardConfig } from '../types';

export interface GitHubCardRefreshRenderer {
	renderGitHubCardWithRefresh: (
		container: HTMLElement,
		githubUrl: string,
		issueId?: string,
		dashboard?: DashboardConfig
	) => Promise<void>;
}

export function createGitHubCardRefreshRenderer(
	plugin: TasksDashboardPlugin
): GitHubCardRefreshRenderer {
	const renderGitHubCardWithRefresh = (
		container: HTMLElement,
		githubUrl: string,
		issueId?: string,
		dashboard?: DashboardConfig
	): Promise<void> => {
		const githubContainer = container.createDiv({ cls: 'tdc-github-container' });
		mount(GitHubCardContainer, {
			target: githubContainer,
			props: { plugin, githubUrl, issueId, dashboard }
		});
		return Promise.resolve();
	};

	return { renderGitHubCardWithRefresh };
}

import TasksDashboardPlugin from '../../main';
import { createGitHubCardRenderer } from '../github/GitHubCardRenderer';
import { DashboardConfig } from '../types';
import { isGitHubRepoUrl, parseGitHubRepoName } from '../utils/github-url';

interface RefreshableGitHubCardOptions<TMetadata> {
	container: HTMLElement;
	githubUrl: string;
	fetchMetadata: () => Promise<TMetadata | undefined>;
	clearCache: () => void;
	renderCard: (metadata: TMetadata, onRefresh: () => void, onUnlink?: () => void) => void;
	onUnlink?: () => void;
}

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
	const githubCardRenderer = createGitHubCardRenderer();

	const renderRefreshableGitHubCard = async <TMetadata>(
		options: RefreshableGitHubCardOptions<TMetadata>
	): Promise<void> => {
		if (!plugin.githubService.isAuthenticated()) {
			githubCardRenderer.renderSimpleLink(options.container, options.githubUrl);
			return;
		}

		githubCardRenderer.renderLoading(options.container);
		const metadata = await options.fetchMetadata();
		if (metadata === undefined) {
			githubCardRenderer.renderSimpleLink(options.container, options.githubUrl);
			return;
		}

		const onRefresh = (): void => {
			options.clearCache();
			githubCardRenderer.renderLoading(options.container);
			void options.fetchMetadata().then((freshMetadata) => {
				if (freshMetadata !== undefined) {
					options.renderCard(freshMetadata, onRefresh, options.onUnlink);
				} else {
					githubCardRenderer.renderError(options.container, 'Failed to refresh');
				}
			});
		};

		options.renderCard(metadata, onRefresh, options.onUnlink);
	};

	const renderGitHubCardWithRefresh = async (
		container: HTMLElement,
		githubUrl: string,
		issueId?: string,
		dashboard?: DashboardConfig
	): Promise<void> => {
		const onUnlink =
			issueId !== undefined && dashboard !== undefined
				? (): void => {
						void plugin.issueManager.removeGitHubLink(dashboard, issueId, githubUrl);
				  }
				: undefined;
		const isRepo = isGitHubRepoUrl(githubUrl);

		if (isRepo) {
			const githubContainer = container.createDiv({ cls: 'tdc-github-container' });

			const parsed = parseGitHubRepoName(githubUrl);
			if (parsed === undefined) {
				githubCardRenderer.renderSimpleLink(githubContainer, githubUrl);
				return;
			}

			await renderRefreshableGitHubCard({
				container: githubContainer,
				githubUrl,
				fetchMetadata: () => plugin.githubService.getRepository(parsed.owner, parsed.repo),
				clearCache: () => {
					plugin.githubService.clearCache();
				},
				renderCard: (metadata, onRefresh, unlinkCallback) => {
					githubCardRenderer.renderRepoCard(
						githubContainer,
						metadata,
						plugin.settings.githubDisplayMode,
						onRefresh,
						unlinkCallback
					);
				},
				onUnlink
			});
			return;
		}

		const githubContainer = container.createDiv({ cls: 'tdc-github-container' });

		await renderRefreshableGitHubCard({
			container: githubContainer,
			githubUrl,
			fetchMetadata: () => plugin.githubService.getMetadataFromUrl(githubUrl),
			clearCache: () => {
				plugin.githubService.clearCacheForUrl(githubUrl);
			},
			renderCard: (metadata, onRefresh, unlinkCallback) => {
				githubCardRenderer.render(
					githubContainer,
					metadata,
					plugin.settings.githubDisplayMode,
					onRefresh,
					unlinkCallback
				);
			},
			onUnlink
		});
	};

	return { renderGitHubCardWithRefresh };
}

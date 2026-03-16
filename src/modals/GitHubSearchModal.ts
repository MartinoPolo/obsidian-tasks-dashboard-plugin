import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import TasksDashboardPlugin from '../../main';
import GitHubSearchContent from '../components/github/GitHubSearchContent.svelte';
import type { DashboardConfig, GitHubIssueMetadata } from '../types';

type OnSelectCallback = (url: string | undefined, metadata?: GitHubIssueMetadata) => void;
export type GitHubSearchMode = 'issues-and-prs' | 'issues-only' | 'prs-only';

export interface GitHubSearchModalLinkedRepositories {
	issueRepository?: string;
	onCancel?: () => void;
	onBack?: () => void;
	showBackButton?: boolean;
	skipButtonLabel?: string;
	confirmButtonLabel?: string;
	selectionLockUntilCleared?: boolean;
	searchMode?: GitHubSearchMode;
	enterSkipsWithoutSelection?: boolean;
	separateSkipAndCancelButtons?: boolean;
	enterSkipLabel?: string;
	showSkipButton?: boolean;
}

export class GitHubSearchModal extends Modal {
	private readonly plugin: TasksDashboardPlugin;
	private readonly dashboard: DashboardConfig;
	private readonly onSelect: OnSelectCallback;
	private readonly linkedRepositories: GitHubSearchModalLinkedRepositories | undefined;
	private svelteComponent: ReturnType<typeof mount> | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		onSelect: OnSelectCallback,
		linkedRepositories?: GitHubSearchModalLinkedRepositories
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.onSelect = onSelect;
		this.linkedRepositories = linkedRepositories;
	}

	onOpen(): void {
		const { modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal', 'tdc-github-search-modal');

		this.svelteComponent = mount(GitHubSearchContent, {
			target: this.contentEl,
			props: {
				plugin: this.plugin,
				dashboard: this.dashboard,
				onselect: (url: string | undefined, metadata?: GitHubIssueMetadata) => {
					this.close();
					this.onSelect(url, metadata);
				},
				linkedRepositories: this.linkedRepositories,
				oncancel: () => {
					this.close();
					this.linkedRepositories?.onCancel?.();
				},
				onback: () => {
					this.close();
					this.linkedRepositories?.onBack?.();
				}
			}
		});
	}

	onClose(): void {
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
			this.svelteComponent = undefined;
		}
		this.contentEl.empty();
	}
}

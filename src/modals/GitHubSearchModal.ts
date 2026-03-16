import { App } from 'obsidian';
import type { Component } from 'svelte';
import TasksDashboardPlugin from '../../main';
import GitHubSearchContent from '../components/github/GitHubSearchContent.svelte';
import type { DashboardConfig, GitHubIssueMetadata } from '../types';
import { SvelteModal } from './SvelteModal';

type OnSelectCallback = (
	url: string | undefined,
	metadata?: GitHubIssueMetadata,
	searchQuery?: string
) => void;
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

export class GitHubSearchModal extends SvelteModal {
	private readonly plugin: TasksDashboardPlugin;
	private readonly dashboard: DashboardConfig;
	private readonly onSelect: OnSelectCallback;
	private readonly linkedRepositories: GitHubSearchModalLinkedRepositories | undefined;

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

	protected getComponent(): Component {
		return GitHubSearchContent as Component;
	}

	protected getProps(): Record<string, unknown> {
		return {
			plugin: this.plugin,
			dashboard: this.dashboard,
			onselect: (
				url: string | undefined,
				metadata?: GitHubIssueMetadata,
				searchQuery?: string
			) => {
				this.close();
				this.onSelect(url, metadata, searchQuery);
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
		};
	}

	protected override getModalClasses(): string[] {
		return ['tdc-prompt-modal', 'tdc-github-search-modal'];
	}
}

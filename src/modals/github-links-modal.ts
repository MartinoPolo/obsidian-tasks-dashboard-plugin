import { Notice } from 'obsidian';
import type { Component } from 'svelte';
import type TasksDashboardPlugin from '../../main';
import type { DashboardConfig, GitHubIssueMetadata } from '../types';
import GitHubLinksContent from '../components/modals/GitHubLinksContent.svelte';
import ManualGitHubUrlContent from '../components/modals/ManualGitHubUrlContent.svelte';
import { GitHubSearchModal } from './GitHubSearchModal';
import { RepositoryPickerModal } from './RepositoryPickerModal';
import { SvelteModal } from './SvelteModal';

class ManualGitHubUrlModal extends SvelteModal {
	private readonly titleText: string;
	private readonly placeholder: string;
	private readonly validate: (url: string) => boolean;
	private readonly onConfirmValue: (url: string) => void;

	constructor(
		plugin: TasksDashboardPlugin,
		titleText: string,
		placeholder: string,
		validate: (url: string) => boolean,
		onConfirmValue: (url: string) => void
	) {
		super(plugin.app);
		this.titleText = titleText;
		this.placeholder = placeholder;
		this.validate = validate;
		this.onConfirmValue = onConfirmValue;
	}

	protected getComponent(): Component {
		return ManualGitHubUrlContent as Component;
	}

	protected getProps(): Record<string, unknown> {
		return {
			title: this.titleText,
			placeholder: this.placeholder,
			validate: this.validate,
			onconfirm: (url: string) => {
				this.close();
				this.onConfirmValue(url);
			},
			oncancel: () => this.close()
		};
	}
}

export class GitHubLinksModal extends SvelteModal {
	private readonly plugin: TasksDashboardPlugin;
	private readonly dashboard: DashboardConfig;
	private readonly issueId: string;
	private readonly githubLinks: string[];

	constructor(
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueId: string,
		githubLinks: string[]
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueId = issueId;
		this.githubLinks = [...githubLinks];
	}

	protected getComponent(): Component {
		return GitHubLinksContent as Component;
	}

	protected getProps(): Record<string, unknown> {
		return {
			plugin: this.plugin,
			dashboard: this.dashboard,
			issueId: this.issueId,
			initialGithubLinks: this.githubLinks,
			onclose: () => this.close(),
			onopenGitHubSearch: (
				type: 'issue' | 'pr',
				linkedRepository: string | undefined,
				onResult: (url: string, metadata?: GitHubIssueMetadata) => void
			) => {
				new GitHubSearchModal(
					this.app,
					this.plugin,
					this.dashboard,
					(url, metadata) => {
						if (url !== undefined) {
							onResult(url, metadata);
						}
					},
					{
						issueRepository: linkedRepository,
						searchMode: type === 'issue' ? 'issues-only' : 'prs-only'
					}
				).open();
			},
			onopenRepoPicker: (onResult: (repoFullName: string) => void) => {
				void this.plugin.githubService.getUserRepositories().then((repositories) => {
					if (repositories.length === 0) {
						new Notice('No repositories found. Paste a URL manually.');
						return;
					}
					new RepositoryPickerModal(this.app, repositories, (repository) => {
						onResult(repository.fullName);
					}).open();
				});
			},
			onopenManualUrl: (
				title: string,
				placeholder: string,
				validate: (url: string) => boolean,
				onResult: (url: string) => void
			) => {
				new ManualGitHubUrlModal(
					this.plugin,
					title,
					placeholder,
					validate,
					onResult
				).open();
			}
		};
	}
}

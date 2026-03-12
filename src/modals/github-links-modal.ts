import { Modal, Notice } from 'obsidian';
import { mount, unmount } from 'svelte';
import type TasksDashboardPlugin from '../../main';
import type { DashboardConfig, GitHubIssueMetadata } from '../types';
import GitHubLinksContent from '../components/modals/GitHubLinksContent.svelte';
import ManualGitHubUrlContent from '../components/modals/ManualGitHubUrlContent.svelte';
import { GitHubSearchModal } from './GitHubSearchModal';
import { RepositoryPickerModal } from './RepositoryPickerModal';

class ManualGitHubUrlModal extends Modal {
	private readonly titleText: string;
	private readonly placeholder: string;
	private readonly validate: (url: string) => boolean;
	private readonly onConfirmValue: (url: string) => void;
	private svelteComponent: ReturnType<typeof mount> | undefined;

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

	override onOpen(): void {
		const { modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');

		this.svelteComponent = mount(ManualGitHubUrlContent, {
			target: this.contentEl,
			props: {
				title: this.titleText,
				placeholder: this.placeholder,
				validate: this.validate,
				onconfirm: (url: string) => {
					this.close();
					this.onConfirmValue(url);
				},
				oncancel: () => this.close()
			}
		});
	}

	override onClose(): void {
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
			this.svelteComponent = undefined;
		}
		this.contentEl.empty();
	}
}

export class GitHubLinksModal extends Modal {
	private readonly plugin: TasksDashboardPlugin;
	private readonly dashboard: DashboardConfig;
	private readonly issueId: string;
	private readonly githubLinks: string[];
	private svelteComponent: ReturnType<typeof mount> | undefined;

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

	onOpen() {
		const { modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');

		this.svelteComponent = mount(GitHubLinksContent, {
			target: this.contentEl,
			props: {
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
					void this.plugin.githubService
						.getUserRepositories()
						.then((repositories) => {
							if (repositories.length === 0) {
								new Notice(
									'No repositories found. Paste a URL manually.'
								);
								return;
							}
							new RepositoryPickerModal(
								this.app,
								repositories,
								(repository) => {
									onResult(repository.fullName);
								}
							).open();
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
			}
		});
	}

	onClose() {
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
			this.svelteComponent = undefined;
		}
		this.contentEl.empty();
	}
}

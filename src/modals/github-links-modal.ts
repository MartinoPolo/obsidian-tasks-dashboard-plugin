import { Modal } from 'obsidian';
import type TasksDashboardPlugin from '../../main';
import type { DashboardConfig } from '../types';
import { setupPromptModal } from './modal-helpers';
import { GitHubSearchModal } from './GitHubSearchModal';
import { parseGitHubUrlInfo } from '../utils/github';
import { isGitHubRepoUrl, parseGitHubRepoFullName } from '../utils/github-url';

function formatLinkLabel(url: string): string {
	const parsed = parseGitHubUrlInfo(url);
	if (parsed !== undefined) {
		const type = parsed.type === 'pr' ? 'PR' : 'Issue';
		return `${type} #${parsed.number}`;
	}
	if (isGitHubRepoUrl(url)) {
		const repoName = parseGitHubRepoFullName(url);
		if (repoName !== undefined) {
			return repoName;
		}
	}
	return url;
}

export class GitHubLinksModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueId: string;
	private githubLinks: string[];

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
		this.renderContent();
	}

	private renderContent(): void {
		setupPromptModal(this, 'GitHub Links');

		if (this.githubLinks.length === 0) {
			this.contentEl.createEl('p', {
				text: 'No GitHub links.',
				cls: 'tdc-delete-message'
			});
		} else {
			const list = this.contentEl.createDiv({ cls: 'tdc-gh-links-list' });
			for (const url of this.githubLinks) {
				const row = list.createDiv({ cls: 'tdc-gh-links-row' });

				const label = row.createEl('a', {
					cls: 'tdc-gh-links-label',
					text: formatLinkLabel(url),
					href: url
				});
				label.setAttribute('target', '_blank');

				const openBtn = row.createEl('button', {
					cls: 'tdc-prompt-btn tdc-prompt-btn-secondary tdc-gh-links-open',
					text: 'Open'
				});
				openBtn.addEventListener('click', () => {
					window.open(url, '_blank');
				});

				const removeBtn = row.createEl('button', {
					cls: 'tdc-prompt-btn tdc-prompt-btn-delete tdc-gh-links-remove',
					text: 'Remove'
				});
				removeBtn.addEventListener('click', () => {
					void this.plugin.issueManager.removeGitHubLink(
						this.dashboard,
						this.issueId,
						url
					).then(() => {
						this.githubLinks = this.githubLinks.filter((link) => link !== url);
						if (this.githubLinks.length === 0) {
							this.close();
						} else {
							this.renderContent();
						}
					});
				});
			}
		}

		const btnContainer = this.contentEl.createDiv({ cls: 'tdc-prompt-buttons' });

		if (this.plugin.githubService.isAuthenticated()) {
			const addBtn = btnContainer.createEl('button', {
				cls: 'tdc-prompt-btn tdc-prompt-btn-confirm',
				text: 'Add Link'
			});
			addBtn.addEventListener('click', () => {
				this.close();
				new GitHubSearchModal(this.app, this.plugin, this.dashboard, (url, metadata) => {
					if (url === undefined) {
						return;
					}
					void this.plugin.issueManager.addGitHubLink(
						this.dashboard,
						this.issueId,
						url,
						metadata
					);
				}).open();
			});
		}

		const closeBtn = btnContainer.createEl('button', {
			cls: 'tdc-prompt-btn tdc-prompt-btn-cancel'
		});
		closeBtn.innerHTML = 'Close <kbd>Esc</kbd>';
		closeBtn.addEventListener('click', () => {
			this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}

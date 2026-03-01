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
	private readonly plugin: TasksDashboardPlugin;
	private readonly dashboard: DashboardConfig;
	private readonly issueId: string;
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

	private createButton(
		container: HTMLElement,
		text: string,
		className: string,
		onClick: () => void
	): HTMLButtonElement {
		const button = container.createEl('button', {
			cls: className,
			text
		});
		button.addEventListener('click', onClick);
		return button;
	}

	private createLinkRow(list: HTMLElement, url: string): void {
		const row = list.createDiv({ cls: 'tdc-gh-links-row' });

		const label = row.createEl('a', {
			cls: 'tdc-gh-links-label',
			text: formatLinkLabel(url),
			href: url
		});
		label.setAttribute('target', '_blank');

		this.createButton(
			row,
			'Open',
			'tdc-prompt-btn tdc-prompt-btn-secondary tdc-gh-links-open',
			() => {
				window.open(url, '_blank');
			}
		);

		this.createButton(
			row,
			'Remove',
			'tdc-prompt-btn tdc-prompt-btn-delete tdc-gh-links-remove',
			() => {
				void this.handleRemoveLink(url);
			}
		);
	}

	private async handleRemoveLink(url: string): Promise<void> {
		await this.plugin.issueManager.removeGitHubLink(this.dashboard, this.issueId, url);
		this.githubLinks = this.githubLinks.filter((link) => link !== url);
		if (this.githubLinks.length === 0) {
			this.close();
			return;
		}
		this.renderContent();
	}

	private openGitHubSearchModal(): void {
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
	}

	private renderLinks(): void {
		if (this.githubLinks.length === 0) {
			this.contentEl.createEl('p', {
				text: 'No GitHub links.',
				cls: 'tdc-delete-message'
			});
			return;
		}

		const list = this.contentEl.createDiv({ cls: 'tdc-gh-links-list' });
		for (const url of this.githubLinks) {
			this.createLinkRow(list, url);
		}
	}

	private renderContent(): void {
		setupPromptModal(this, 'GitHub Links');
		this.renderLinks();

		const btnContainer = this.contentEl.createDiv({ cls: 'tdc-prompt-buttons' });

		if (this.plugin.githubService.isAuthenticated()) {
			this.createButton(
				btnContainer,
				'Add Link',
				'tdc-prompt-btn tdc-prompt-btn-confirm',
				() => {
					this.openGitHubSearchModal();
				}
			);
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

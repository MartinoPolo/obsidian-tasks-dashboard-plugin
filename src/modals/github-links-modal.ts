import { Menu, Modal, Notice } from 'obsidian';
import type TasksDashboardPlugin from '../../main';
import type { DashboardConfig, GitHubIssueMetadata } from '../types';
import {
	createConfirmCancelButtons,
	createInputWithEnterHandler,
	createPromptButtonsContainer,
	createPromptCancelButton,
	createPromptConfirmButton,
	setupPromptModal
} from './modal-helpers';
import { GitHubSearchModal } from './GitHubSearchModal';
import {
	getGitHubLinkType,
	isGitHubWebUrl,
	parseGitHubUrlInfo,
	type GitHubLinkType
} from '../utils/github';
import { isGitHubRepoUrl, parseGitHubRepoFullName } from '../utils/github-url';
import { RepositoryPickerModal } from './RepositoryPickerModal';

type AssignableGitHubLinkType = GitHubLinkType;

interface AssignedGitHubLinks {
	issue: string | undefined;
	pr: string | undefined;
	repository: string | undefined;
}

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

function toRepoUrl(fullName: string): string {
	return `https://github.com/${fullName}`;
}

function isValidGitHubUrlForType(url: string, type: AssignableGitHubLinkType): boolean {
	const parsedType = getGitHubLinkType(url);
	return parsedType === type;
}

function getAssignedLinks(githubLinks: string[]): AssignedGitHubLinks {
	const assigned: AssignedGitHubLinks = {
		issue: undefined,
		pr: undefined,
		repository: undefined
	};

	for (const link of githubLinks) {
		const type = getGitHubLinkType(link);
		if (type === undefined) {
			continue;
		}
		if (assigned[type] === undefined) {
			assigned[type] = link;
		}
	}

	return assigned;
}

class ManualGitHubUrlModal extends Modal {
	private readonly titleText: string;
	private readonly placeholder: string;
	private readonly validate: (url: string) => boolean;
	private readonly onConfirmValue: (url: string) => void;
	private input: HTMLInputElement | undefined;

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
		setupPromptModal(this, this.titleText);
		this.input = createInputWithEnterHandler(this.contentEl, this.placeholder, () => {
			this.confirm();
		});
		createConfirmCancelButtons(
			this.contentEl,
			'Save',
			() => {
				this.confirm();
			},
			() => {
				this.close();
			}
		);
	}

	private confirm(): void {
		const value = this.input?.value.trim() ?? '';
		if (!isGitHubWebUrl(value)) {
			new Notice('Enter a valid GitHub URL.');
			return;
		}

		if (!this.validate(value)) {
			new Notice('URL type does not match the selected assignment.');
			return;
		}

		this.close();
		this.onConfirmValue(value);
	}

	override onClose(): void {
		this.contentEl.empty();
		this.input = undefined;
	}
}

export class GitHubLinksModal extends Modal {
	private readonly plugin: TasksDashboardPlugin;
	private readonly dashboard: DashboardConfig;
	private readonly issueId: string;
	private githubLinks: string[];
	private hasChanges = false;

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

	private runMutationAndRerender(action: () => Promise<void>): void {
		void action().then(() => {
			this.renderContent();
		});
	}

	private openAssignmentMenuNearModal(type: AssignableGitHubLinkType): void {
		const modalRect = this.modalEl.getBoundingClientRect();
		const syntheticEvent = new MouseEvent('click', {
			clientX: modalRect.left + 24,
			clientY: modalRect.top + 24
		});
		this.openAssignmentMenu(syntheticEvent, type);
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
				this.runMutationAndRerender(async () => {
					await this.handleRemoveLink(url);
				});
			}
		);
	}

	private getLinkedRepository(): string | undefined {
		const assigned = getAssignedLinks(this.githubLinks);
		if (assigned.repository === undefined) {
			return undefined;
		}
		return parseGitHubRepoFullName(assigned.repository);
	}

	private async removeLinkByType(type: AssignableGitHubLinkType): Promise<void> {
		const linksToRemove = this.githubLinks.filter((link) => getGitHubLinkType(link) === type);
		for (const link of linksToRemove) {
			await this.plugin.issueManager.removeGitHubLink(this.dashboard, this.issueId, link);
			this.hasChanges = true;
		}
		this.githubLinks = this.githubLinks.filter((link) => getGitHubLinkType(link) !== type);
	}

	private async assignLinkByType(
		type: AssignableGitHubLinkType,
		url: string,
		metadata?: GitHubIssueMetadata
	): Promise<void> {
		await this.removeLinkByType(type);
		if (!this.githubLinks.includes(url)) {
			await this.plugin.issueManager.addGitHubLink(
				this.dashboard,
				this.issueId,
				url,
				metadata
			);
			this.hasChanges = true;
			this.githubLinks.push(url);
		}
	}

	private openManualAssignmentModal(type: AssignableGitHubLinkType): void {
		const typeLabel = type === 'pr' ? 'PR' : type === 'issue' ? 'Issue' : 'Repository';
		const placeholder =
			type === 'repository'
				? 'https://github.com/owner/repo'
				: `https://github.com/owner/repo/${type === 'pr' ? 'pull' : 'issues'}/123`;

		new ManualGitHubUrlModal(
			this.plugin,
			`Assign GitHub ${typeLabel}`,
			placeholder,
			(url) => {
				return isValidGitHubUrlForType(url, type);
			},
			(url) => {
				this.runMutationAndRerender(async () => {
					await this.assignLinkByType(type, url);
				});
			}
		).open();
	}

	private openRepositoryAssignmentFlow(): void {
		if (!this.plugin.githubService.isAuthenticated()) {
			this.openManualAssignmentModal('repository');
			return;
		}

		void this.plugin.githubService.getUserRepositories().then((repositories) => {
			if (repositories.length === 0) {
				new Notice('No repositories found. Paste a URL manually.');
				this.openManualAssignmentModal('repository');
				return;
			}

			new RepositoryPickerModal(this.app, repositories, (repository) => {
				this.runMutationAndRerender(async () => {
					await this.assignLinkByType('repository', toRepoUrl(repository.fullName));
				});
			}).open();
		});
	}

	private openIssueOrPrAssignmentFlow(type: 'issue' | 'pr'): void {
		if (!this.plugin.githubService.isAuthenticated()) {
			this.openManualAssignmentModal(type);
			return;
		}

		const linkedRepository = this.getLinkedRepository();
		new GitHubSearchModal(
			this.app,
			this.plugin,
			this.dashboard,
			(url, metadata) => {
				if (url === undefined) {
					return;
				}
				const parsedType = getGitHubLinkType(url);
				if (parsedType !== type) {
					new Notice(`Selected link is not a GitHub ${type.toUpperCase()}.`);
					return;
				}

				this.runMutationAndRerender(async () => {
					await this.assignLinkByType(type, url, metadata);
				});
			},
			{
				issueRepository: linkedRepository
			}
		).open();
	}

	private openAssignmentMenu(event: MouseEvent, type: AssignableGitHubLinkType): void {
		const menu = new Menu();
		menu.addItem((item) => {
			item.setTitle('Pick from GitHub').onClick(() => {
				if (type === 'repository') {
					this.openRepositoryAssignmentFlow();
					return;
				}
				this.openIssueOrPrAssignmentFlow(type);
			});
		});
		menu.addItem((item) => {
			item.setTitle('Paste URL manually').onClick(() => {
				this.openManualAssignmentModal(type);
			});
		});
		menu.showAtPosition({ x: event.clientX, y: event.clientY });
	}

	private renderTypedLinkRow(
		list: HTMLElement,
		type: AssignableGitHubLinkType,
		title: string,
		url: string | undefined
	): void {
		const row = list.createDiv({ cls: 'tdc-gh-links-row' });
		const labelText = url === undefined ? `${title}: Not assigned` : `${title}: ${formatLinkLabel(url)}`;

		if (url === undefined) {
			row.createDiv({ cls: 'tdc-gh-links-label', text: labelText });
		} else {
			const label = row.createEl('a', {
				cls: 'tdc-gh-links-label',
				text: labelText,
				href: url
			});
			label.setAttribute('target', '_blank');
		}

		if (url !== undefined) {
			this.createButton(
				row,
				'Open',
				'tdc-prompt-btn tdc-prompt-btn-secondary tdc-gh-links-open',
				() => {
					window.open(url, '_blank');
				}
			);
		}

		const assignButton = this.createButton(
			row,
			url === undefined ? 'Assign' : 'Replace',
			'tdc-prompt-btn tdc-prompt-btn-confirm',
			() => {
				this.openAssignmentMenuNearModal(type);
			}
		);

		assignButton.addEventListener('contextmenu', (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.openAssignmentMenu(event, type);
		});

		if (url !== undefined) {
			this.createButton(
				row,
				'Clear',
				'tdc-prompt-btn tdc-prompt-btn-delete tdc-gh-links-remove',
				() => {
					this.runMutationAndRerender(async () => {
						await this.removeLinkByType(type);
					});
				}
			);
		}
	}

	private async handleRemoveLink(url: string): Promise<void> {
		await this.plugin.issueManager.removeGitHubLink(this.dashboard, this.issueId, url);
		this.githubLinks = this.githubLinks.filter((link) => link !== url);
		this.hasChanges = true;
	}

	private renderLinks(): void {
		const list = this.contentEl.createDiv({ cls: 'tdc-gh-links-list' });
		const assigned = getAssignedLinks(this.githubLinks);
		this.renderTypedLinkRow(list, 'issue', 'Issue', assigned.issue);
		this.renderTypedLinkRow(list, 'pr', 'Pull Request', assigned.pr);
		this.renderTypedLinkRow(list, 'repository', 'Repository', assigned.repository);

		const unknownLinks = this.githubLinks.filter((link) => getGitHubLinkType(link) === undefined);
		if (unknownLinks.length > 0) {
			this.contentEl.createEl('h4', { text: 'Other links' });
			const unknownList = this.contentEl.createDiv({ cls: 'tdc-gh-links-list' });
			for (const url of unknownLinks) {
				this.createLinkRow(unknownList, url);
			}
		}
	}

	private renderContent(): void {
		setupPromptModal(this, 'Edit GitHub Links');
		this.renderLinks();

		const btnContainer = createPromptButtonsContainer(this.contentEl);
		void createPromptConfirmButton(btnContainer, () => {
			if (this.hasChanges) {
				new Notice('GitHub links updated.');
			}
			this.close();
		});

		void createPromptCancelButton(btnContainer, () => {
			this.close();
		}, 'Close');
	}

	onClose() {
		this.contentEl.empty();
	}
}

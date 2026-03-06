import { Modal } from 'obsidian';
import type TasksDashboardPlugin from '../../main';
import type { DashboardConfig, GitHubRepository } from '../types';

const DESCRIPTION_MAX_LENGTH = 80;

type OnSaveRepositories = (linkedRepos: string[]) => void;

export class RepositoryLinkerModal extends Modal {
	private readonly plugin: TasksDashboardPlugin;
	private readonly dashboard: DashboardConfig;
	private readonly onSave: OnSaveRepositories;
	private linkedRepos: Set<string>;
	private allRepositories: GitHubRepository[] = [];
	private searchQuery = '';
	private availableListContainer: HTMLElement | undefined;
	private linkedListContainer: HTMLElement | undefined;
	private linkedCountLabel: HTMLElement | undefined;

	constructor(
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		onSave: OnSaveRepositories
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.onSave = onSave;
		this.linkedRepos = new Set(dashboard.githubRepos ?? []);
	}

	override onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('tdc-repo-linker-modal');

		contentEl.createEl('h3', { text: 'Link GitHub repositories' });

		const searchInput = contentEl.createEl('input', {
			cls: 'tdc-repo-linker-search',
			attr: {
				type: 'text',
				placeholder: 'Search repositories...'
			}
		});
		searchInput.addEventListener('input', () => {
			this.searchQuery = searchInput.value;
			this.renderAvailableList();
		});

		contentEl.createEl('div', {
			cls: 'tdc-repo-linker-section-label',
			text: 'Available repositories'
		});

		this.availableListContainer = contentEl.createDiv({
			cls: 'tdc-repo-linker-available-list'
		});

		this.linkedCountLabel = contentEl.createEl('div', {
			cls: 'tdc-repo-linker-section-label'
		});

		this.linkedListContainer = contentEl.createDiv({
			cls: 'tdc-repo-linker-linked-list'
		});

		const buttonRow = contentEl.createDiv({ cls: 'tdc-repo-linker-buttons' });
		const doneButton = buttonRow.createEl('button', {
			cls: 'mod-cta',
			text: 'Done'
		});
		doneButton.addEventListener('click', () => {
			this.saveAndClose();
		});

		this.loadRepositories();
	}

	override onClose(): void {
		this.contentEl.empty();
	}

	private loadRepositories(): void {
		if (this.availableListContainer === undefined) {
			return;
		}

		if (!this.plugin.githubService.isAuthenticated()) {
			this.availableListContainer.empty();
			this.availableListContainer.createDiv({
				cls: 'tdc-repo-linker-message',
				text: 'Configure GitHub token in plugin settings to browse repositories.'
			});
			this.renderLinkedList();
			return;
		}

		this.availableListContainer.empty();
		const loadingContainer = this.availableListContainer.createDiv({
			cls: 'tdc-repo-linker-loading'
		});
		loadingContainer.createSpan({ cls: 'tdc-loading-spinner' });
		loadingContainer.createSpan({ text: 'Loading repositories...' });

		void this.plugin.githubService
			.getUserRepositories()
			.then((repositories) => {
				this.allRepositories = repositories;
				this.renderAvailableList();
				this.renderLinkedList();
			})
			.catch(() => {
				if (this.availableListContainer === undefined) {
					return;
				}
				this.availableListContainer.empty();
				this.availableListContainer.createDiv({
					cls: 'tdc-repo-linker-message',
					text: 'Failed to load repositories. Check your GitHub connection.'
				});
				this.renderLinkedList();
			});
	}

	private renderAvailableList(): void {
		if (this.availableListContainer === undefined) {
			return;
		}

		this.availableListContainer.empty();
		const query = this.searchQuery.toLowerCase();

		const filtered = this.allRepositories.filter((repository) => {
			if (query === '') {
				return true;
			}
			const matchesName = repository.fullName.toLowerCase().includes(query);
			const matchesDescription = repository.description.toLowerCase().includes(query);
			return matchesName || matchesDescription;
		});

		if (filtered.length === 0 && this.allRepositories.length > 0) {
			this.availableListContainer.createDiv({
				cls: 'tdc-repo-linker-message',
				text: 'No repositories match your search.'
			});
			return;
		}

		for (const repository of filtered) {
			const isLinked = this.linkedRepos.has(repository.fullName);
			const row = this.availableListContainer.createDiv({
				cls: 'tdc-repo-linker-available-row'
			});

			const checkbox = row.createEl('input', {
				attr: { type: 'checkbox' }
			});
			checkbox.checked = isLinked;

			const infoContainer = row.createDiv({ cls: 'tdc-repo-linker-repo-info' });
			const headerRow = infoContainer.createDiv({ cls: 'tdc-repo-suggestion-header' });
			headerRow.createSpan({ cls: 'tdc-repo-suggestion-name', text: repository.fullName });
			const visibilityLabel = repository.isPrivate ? 'Private' : 'Public';
			const visibilityClass = repository.isPrivate
				? 'tdc-repo-badge tdc-repo-badge-private'
				: 'tdc-repo-badge tdc-repo-badge-public';
			headerRow.createSpan({ cls: visibilityClass, text: visibilityLabel });

			if (repository.description !== '') {
				const truncatedDescription =
					repository.description.length > DESCRIPTION_MAX_LENGTH
						? `${repository.description.slice(0, DESCRIPTION_MAX_LENGTH)}...`
						: repository.description;
				infoContainer.createDiv({
					cls: 'tdc-repo-suggestion-description',
					text: truncatedDescription
				});
			}

			const handleToggle = (): void => {
				if (this.linkedRepos.has(repository.fullName)) {
					this.linkedRepos.delete(repository.fullName);
					checkbox.checked = false;
				} else {
					this.linkedRepos.add(repository.fullName);
					checkbox.checked = true;
				}
				this.renderLinkedList();
			};

			checkbox.addEventListener('change', handleToggle);
			row.addEventListener('click', (event) => {
				if (event.target === checkbox) {
					return;
				}
				handleToggle();
			});
		}
	}

	private renderLinkedList(): void {
		if (this.linkedListContainer === undefined || this.linkedCountLabel === undefined) {
			return;
		}

		const linkedArray = Array.from(this.linkedRepos);
		this.linkedCountLabel.textContent = `Linked (${linkedArray.length})`;
		this.linkedListContainer.empty();

		if (linkedArray.length === 0) {
			this.linkedListContainer.createDiv({
				cls: 'tdc-repo-linker-message',
				text: 'No repositories linked.'
			});
			return;
		}

		for (const repoName of linkedArray) {
			const row = this.linkedListContainer.createDiv({
				cls: 'tdc-repo-linker-linked-row'
			});
			row.createSpan({ text: repoName });
			const unlinkButton = row.createEl('button', {
				cls: 'tdc-repo-linker-unlink-btn',
				attr: { 'aria-label': `Unlink ${repoName}` }
			});
			unlinkButton.textContent = '\u00D7';
			unlinkButton.addEventListener('click', () => {
				this.linkedRepos.delete(repoName);
				this.renderAvailableList();
				this.renderLinkedList();
			});
		}
	}

	private saveAndClose(): void {
		const repos = Array.from(this.linkedRepos);
		this.onSave(repos);
		this.close();
	}
}

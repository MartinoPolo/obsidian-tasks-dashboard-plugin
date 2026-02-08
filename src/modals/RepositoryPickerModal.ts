import { App, FuzzySuggestModal } from 'obsidian';
import { GitHubRepository } from '../types';

type OnSelectRepository = (repository: GitHubRepository) => void;

export class RepositoryPickerModal extends FuzzySuggestModal<GitHubRepository> {
	private repositories: GitHubRepository[];
	private onSelectRepository: OnSelectRepository;

	constructor(app: App, repositories: GitHubRepository[], onSelect: OnSelectRepository) {
		super(app);
		this.repositories = repositories;
		this.onSelectRepository = onSelect;
		this.setPlaceholder('Search repositories...');
		this.modalEl.addClass('tdc-repo-picker-modal');
	}

	getItems(): GitHubRepository[] {
		return this.repositories;
	}

	getItemText(repository: GitHubRepository): string {
		return repository.fullName;
	}

	renderSuggestion(match: { item: GitHubRepository }, element: HTMLElement): void {
		const repository = match.item;

		const container = element.createDiv({ cls: 'tdc-repo-suggestion' });

		const headerRow = container.createDiv({ cls: 'tdc-repo-suggestion-header' });
		headerRow.createSpan({ cls: 'tdc-repo-suggestion-name', text: repository.fullName });

		const visibilityLabel = repository.isPrivate ? 'Private' : 'Public';
		const visibilityClass = repository.isPrivate
			? 'tdc-repo-badge-private'
			: 'tdc-repo-badge-public';
		headerRow.createSpan({
			cls: `tdc-repo-badge ${visibilityClass}`,
			text: visibilityLabel
		});

		if (repository.description !== '') {
			const maxLength = 80;
			const truncatedDescription =
				repository.description.length > maxLength
					? repository.description.slice(0, maxLength) + '...'
					: repository.description;
			container.createDiv({
				cls: 'tdc-repo-suggestion-description',
				text: truncatedDescription
			});
		}
	}

	onChooseItem(repository: GitHubRepository): void {
		this.onSelectRepository(repository);
	}
}

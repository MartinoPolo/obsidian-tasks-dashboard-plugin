import { App, FuzzySuggestModal } from 'obsidian';
import { GitHubRepository } from '../types';

type OnSelectRepository = (repository: GitHubRepository) => void;
const SEARCH_PLACEHOLDER = 'Search repositories...';
const DESCRIPTION_MAX_LENGTH = 80;
const PRIVATE_LABEL = 'Private';
const PUBLIC_LABEL = 'Public';
const PRIVATE_BADGE_CLASS = 'tdc-repo-badge-private';
const PUBLIC_BADGE_CLASS = 'tdc-repo-badge-public';

export class RepositoryPickerModal extends FuzzySuggestModal<GitHubRepository> {
	private readonly repositories: GitHubRepository[];
	private readonly onSelectRepository: OnSelectRepository;

	constructor(app: App, repositories: GitHubRepository[], onSelect: OnSelectRepository) {
		super(app);
		this.repositories = repositories;
		this.onSelectRepository = onSelect;
		this.setPlaceholder(SEARCH_PLACEHOLDER);
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
		headerRow.createSpan(this.createVisibilityBadgeAttributes(repository));
		this.renderDescription(container, repository.description);
	}

	onChooseItem(repository: GitHubRepository): void {
		this.onSelectRepository(repository);
	}

	private createVisibilityBadgeAttributes(repository: GitHubRepository): {
		cls: string;
		text: string;
	} {
		const visibilityLabel = repository.isPrivate ? PRIVATE_LABEL : PUBLIC_LABEL;
		const visibilityClass = repository.isPrivate ? PRIVATE_BADGE_CLASS : PUBLIC_BADGE_CLASS;

		return {
			cls: `tdc-repo-badge ${visibilityClass}`,
			text: visibilityLabel
		};
	}

	private renderDescription(container: HTMLElement, description: string): void {
		if (description === '') {
			return;
		}

		container.createDiv({
			cls: 'tdc-repo-suggestion-description',
			text: this.truncateDescription(description)
		});
	}

	private truncateDescription(description: string): string {
		if (description.length <= DESCRIPTION_MAX_LENGTH) {
			return description;
		}

		return `${description.slice(0, DESCRIPTION_MAX_LENGTH)}...`;
	}
}

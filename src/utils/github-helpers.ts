import { GitHubIssueMetadata } from '../types';

/**
 * Returns the CSS state class suffix for a GitHub issue/PR.
 * Example: 'merged', 'draft', 'open', 'closed'
 */
export function getStateClass(metadata: GitHubIssueMetadata): string {
	if (metadata.isPR) {
		if (metadata.prStatus === 'merged') {
			return 'merged';
		}
		if (metadata.prStatus === 'draft') {
			return 'draft';
		}
	}
	return metadata.state === 'open' ? 'open' : 'closed';
}

/**
 * Returns the display text for a GitHub issue/PR state.
 */
export function getStateText(metadata: GitHubIssueMetadata): string {
	if (metadata.isPR) {
		if (metadata.prStatus === 'merged') {
			return 'Merged';
		}
		if (metadata.prStatus === 'draft') {
			return 'Draft';
		}
	}
	return metadata.state === 'open' ? 'Open' : 'Closed';
}

export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) {
		return text;
	}
	return text.substring(0, maxLength).trim() + '...';
}

export function formatRelativeDate(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		return 'today';
	}
	if (diffDays === 1) {
		return 'yesterday';
	}
	if (diffDays < 7) {
		return `${diffDays} days ago`;
	}
	if (diffDays < 30) {
		const weeks = Math.floor(diffDays / 7);
		return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
	}
	if (diffDays < 365) {
		const months = Math.floor(diffDays / 30);
		return `${months} month${months > 1 ? 's' : ''} ago`;
	}
	const years = Math.floor(diffDays / 365);
	return `${years} year${years > 1 ? 's' : ''} ago`;
}

export function getContrastColor(hexColor: string): string {
	const r = parseInt(hexColor.substring(0, 2), 16);
	const g = parseInt(hexColor.substring(2, 4), 16);
	const b = parseInt(hexColor.substring(4, 6), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.5 ? '#000000' : '#ffffff';
}

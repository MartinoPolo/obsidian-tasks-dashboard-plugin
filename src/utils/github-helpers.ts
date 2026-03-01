import { GitHubIssueMetadata } from '../types';
import { BLACK_HEX, WHITE_HEX } from './color';

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const WEEK_IN_DAYS = 7;
const MONTH_IN_DAYS = 30;
const YEAR_IN_DAYS = 365;

interface StatePresentation {
	className: string;
	text: string;
}

type IssueVisualState = 'merged' | 'draft' | 'open' | 'closed';

const STATE_PRESENTATIONS: Record<IssueVisualState, StatePresentation> = {
	merged: { className: 'merged', text: 'Merged' },
	draft: { className: 'draft', text: 'Draft' },
	open: { className: 'open', text: 'Open' },
	closed: { className: 'closed', text: 'Closed' }
};

function resolveIssueVisualState(metadata: GitHubIssueMetadata): IssueVisualState {
	if (metadata.isPR && metadata.prStatus === 'merged') {
		return 'merged';
	}

	if (metadata.isPR && metadata.prStatus === 'draft') {
		return 'draft';
	}

	return metadata.state === 'open' ? 'open' : 'closed';
}

function getIssueStatePresentation(metadata: GitHubIssueMetadata): StatePresentation {
	return STATE_PRESENTATIONS[resolveIssueVisualState(metadata)];
}

function pluralize(value: number, unit: string): string {
	return `${value} ${unit}${value > 1 ? 's' : ''} ago`;
}

function parseHexColorComponent(hex: string, startIndex: number): number {
	const component = Number.parseInt(hex.substring(startIndex, startIndex + 2), 16);
	if (Number.isNaN(component)) {
		return 0;
	}

	return component;
}

function normalizeHexColor(hexColor: string): string {
	return hexColor.startsWith('#') ? hexColor.substring(1) : hexColor;
}

/**
 * Returns the CSS state class suffix for a GitHub issue/PR.
 * Example: 'merged', 'draft', 'open', 'closed'
 */
export function getStateClass(metadata: GitHubIssueMetadata): string {
	return getIssueStatePresentation(metadata).className;
}

/**
 * Returns the display text for a GitHub issue/PR state.
 */
export function getStateText(metadata: GitHubIssueMetadata): string {
	return getIssueStatePresentation(metadata).text;
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
	const diffDays = Math.floor(diffMs / DAY_IN_MS);

	if (diffDays === 0) {
		return 'today';
	}
	if (diffDays === 1) {
		return 'yesterday';
	}
	if (diffDays < WEEK_IN_DAYS) {
		return `${diffDays} days ago`;
	}
	if (diffDays < MONTH_IN_DAYS) {
		const weeks = Math.floor(diffDays / WEEK_IN_DAYS);
		return pluralize(weeks, 'week');
	}
	if (diffDays < YEAR_IN_DAYS) {
		const months = Math.floor(diffDays / MONTH_IN_DAYS);
		return pluralize(months, 'month');
	}
	const years = Math.floor(diffDays / YEAR_IN_DAYS);
	return pluralize(years, 'year');
}

export function getContrastColor(hexColor: string): string {
	const normalizedHexColor = normalizeHexColor(hexColor);
	const r = parseHexColorComponent(normalizedHexColor, 0);
	const g = parseHexColorComponent(normalizedHexColor, 2);
	const b = parseHexColorComponent(normalizedHexColor, 4);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.5 ? BLACK_HEX : WHITE_HEX;
}

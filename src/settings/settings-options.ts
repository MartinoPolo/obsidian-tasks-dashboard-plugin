import {
	GitHubAuthMethod,
	GitHubDisplayMode,
	ProgressDisplayMode
} from '../types';

export type VisibilityToggleKey =
	| 'showGitHubButtons'
	| 'showFolderButtons'
	| 'showTerminalButtons'
	| 'showVSCodeButtons';

export interface OptionDefinition<T extends string> {
	value: T;
	label: string;
}

export interface DashboardVisibilityToggleDefinition {
	key: VisibilityToggleKey;
	name: string;
	description: string;
}

export const DEFAULT_DASHBOARD_FILENAME = 'Dashboard.md';
export const ISSUES_FOLDER_NAME = 'Issues';
export const GITHUB_TOKEN_CREATION_URL =
	'https://github.com/settings/tokens/new?scopes=repo&description=Obsidian%20Tasks%20Dashboard';

export const PROGRESS_DISPLAY_OPTIONS: OptionDefinition<ProgressDisplayMode>[] = [
	{ value: 'number', label: 'Number only (1/5)' },
	{ value: 'percentage', label: 'Percentage only (20%)' },
	{ value: 'bar', label: 'Progress bar only' },
	{ value: 'number-percentage', label: 'Number & percentage (1/5 (20%))' },
	{ value: 'all', label: 'All (bar + percentage + number)' }
];

export const GITHUB_AUTH_METHOD_OPTIONS: OptionDefinition<GitHubAuthMethod>[] = [
	{ value: 'none', label: 'Not configured' },
	{ value: 'pat', label: 'Personal Access Token' }
];

export const GITHUB_DISPLAY_MODE_OPTIONS: OptionDefinition<GitHubDisplayMode>[] = [
	{ value: 'minimal', label: 'Minimal (number and status only)' },
	{ value: 'compact', label: 'Compact (number, title, status, labels)' },
	{ value: 'full', label: 'Full (includes description and assignees)' }
];

export const DASHBOARD_VISIBILITY_TOGGLES: DashboardVisibilityToggleDefinition[] = [
	{
		key: 'showGitHubButtons',
		name: 'Show GitHub Buttons',
		description: 'Show GitHub link buttons on each issue'
	},
	{
		key: 'showFolderButtons',
		name: 'Show Folder Buttons',
		description: 'Show folder buttons on each issue and the dashboard header'
	},
	{
		key: 'showTerminalButtons',
		name: 'Show Terminal Buttons',
		description: 'Show terminal buttons on each issue and the dashboard header'
	},
	{
		key: 'showVSCodeButtons',
		name: 'Show VS Code Buttons',
		description: 'Show VS Code buttons on each issue and the dashboard header'
	}
];

function isOneOf<T extends string>(value: string, options: OptionDefinition<T>[]): value is T {
	for (const option of options) {
		if (option.value === value) {
			return true;
		}
	}

	return false;
}

export function isGitHubAuthMethod(value: string): value is GitHubAuthMethod {
	return isOneOf(value, GITHUB_AUTH_METHOD_OPTIONS);
}

export function isProgressDisplayMode(value: string): value is ProgressDisplayMode {
	return isOneOf(value, PROGRESS_DISPLAY_OPTIONS);
}

export function isGitHubDisplayMode(value: string): value is GitHubDisplayMode {
	return isOneOf(value, GITHUB_DISPLAY_MODE_OPTIONS);
}

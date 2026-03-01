import type { IssueActionKey } from '../types';

export const REACTIVE_RENDER_DEBOUNCE_MS = 100;
export const ISSUE_SURFACE_COLOR_FALLBACK = '#4a8cc7';

export const ISSUE_CONTAINER_COLOR_VARIABLES = [
	'--tdc-issue-main-color',
	'--tdc-issue-controls-bg',
	'--tdc-issue-checklist-bg',
	'--tdc-issue-controls-border',
	'--tdc-issue-checklist-border'
] as const;

export const ISSUE_ACTION_ORDER: readonly IssueActionKey[] = [
	'folder',
	'terminal',
	'vscode',
	'github',
	'move-up',
	'move-down',
	'move-top',
	'move-bottom',
	'rename',
	'color',
	'archive',
	'delete'
];

export const DEFAULT_ROW1_ACTIONS: readonly IssueActionKey[] = [
	'folder',
	'terminal',
	'vscode',
	'github',
	'move-up',
	'move-down'
];

export const HEADER_HOVER_TITLE_MIN_WIDTH = 200;

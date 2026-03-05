import type { IssueActionKey } from '../types';
import { DEFAULT_ISSUE_COLOR } from '../utils/color';

export const REACTIVE_RENDER_DEBOUNCE_MS = 100;
export const ISSUE_SURFACE_COLOR_FALLBACK = DEFAULT_ISSUE_COLOR;

export const ISSUE_CONTAINER_COLOR_VARIABLES = [
	'--tdc-issue-main-color',
	'--tdc-issue-header-link-color',
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
	'worktree',
	'move-up',
	'move-down',
	'move-top',
	'move-bottom',
	'rename',
	'change-priority',
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

export const HEADER_HOVER_TITLE_MIN_WIDTH = 100;

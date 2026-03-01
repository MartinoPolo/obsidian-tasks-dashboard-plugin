import type { IssueActionKey } from '../types';

type IssueActionIconKey = keyof typeof import('./header-actions').ICONS;

export interface IssueActionDescriptor {
	key: IssueActionKey;
	label: string;
	iconKey: IssueActionIconKey;
	cssClass: string;
	shouldRender: boolean;
	faded: boolean;
	onClick: () => void;
	onContextMenu?: (event: MouseEvent) => void;
}

export interface RuntimeIssueActionLayout {
	row1: IssueActionKey[];
	row2: IssueActionKey[];
	hidden: IssueActionKey[];
}

export interface ParsedKeyValueLine {
	key: string;
	value: string;
}

export interface ControlParams {
	issue: string;
	name: string;
	path: string;
	dashboard: string;
	priority: import('../types').Priority;
	github?: string;
	githubLinks: string[];
}

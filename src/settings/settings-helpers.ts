import { App } from 'obsidian';
import { ISSUES_FOLDER_NAME, OptionDefinition } from './settings-options';
export { getDashboardFilename, getDashboardPath } from '../utils/dashboard-path';

export interface AppWithSettingsTab extends App {
	setting?: {
		openTabById: (tabId: string) => void;
	};
}

export function addDropdownOptions<T extends string>(
	dropdown: {
		addOption: (value: string, display: string) => typeof dropdown;
	},
	options: OptionDefinition<T>[]
): void {
	for (const option of options) {
		dropdown.addOption(option.value, option.label);
	}
}

export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === 'string') {
		return error;
	}

	return 'Unknown error';
}

export { isNonEmptyString } from '../utils/string-utils';

export function resolveCollapsedDashboardSettingsMap(settings: object): Record<string, boolean> {
	const candidate: unknown = Reflect.get(settings, 'collapsedDashboardSettings');
	if (typeof candidate === 'object' && candidate !== null && !Array.isArray(candidate)) {
		return candidate as Record<string, boolean>;
	}

	const emptyMap: Record<string, boolean> = {};
	Reflect.set(settings, 'collapsedDashboardSettings', emptyMap);
	return emptyMap;
}

export function withMarkdownExtension(filename: string): string {
	return filename.endsWith('.md') ? filename : `${filename}.md`;
}

export function buildVaultPath(rootPath: string, filename: string): string {
	if (rootPath === '') {
		return filename;
	}

	return `${rootPath}/${filename}`;
}

export function getDashboardIssuesFolderPath(dashboard: { rootPath: string }): string {
	return buildVaultPath(dashboard.rootPath, ISSUES_FOLDER_NAME);
}

export function hasSettingsTabApi(app: unknown): app is AppWithSettingsTab {
	if (typeof app !== 'object' || app === null) {
		return false;
	}

	if (!('setting' in app)) {
		return false;
	}

	const candidateSetting = app.setting;
	if (typeof candidateSetting !== 'object' || candidateSetting === null) {
		return false;
	}

	if (!('openTabById' in candidateSetting)) {
		return false;
	}

	return typeof candidateSetting.openTabById === 'function';
}

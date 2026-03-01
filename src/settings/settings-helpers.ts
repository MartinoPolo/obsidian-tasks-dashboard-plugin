import { App } from 'obsidian';
import { DashboardConfig } from '../types';
import {
	DEFAULT_DASHBOARD_FILENAME,
	ISSUES_FOLDER_NAME,
	OptionDefinition
} from './settings-options';

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

	return 'Unknown error';
}

export function isNonEmptyString(value: string | undefined): value is string {
	return value !== undefined && value !== '';
}

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

export function getDashboardFilename(dashboard: DashboardConfig): string {
	return dashboard.dashboardFilename || DEFAULT_DASHBOARD_FILENAME;
}

export function buildVaultPath(rootPath: string, filename: string): string {
	if (rootPath === '') {
		return filename;
	}

	return `${rootPath}/${filename}`;
}

export function getDashboardPath(dashboard: DashboardConfig): string {
	return buildVaultPath(dashboard.rootPath, getDashboardFilename(dashboard));
}

export function getDashboardIssuesFolderPath(dashboard: DashboardConfig): string {
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

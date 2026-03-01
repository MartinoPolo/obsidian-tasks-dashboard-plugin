import { App, Notice, TFile, TFolder } from 'obsidian';
import { parseDashboard } from '../dashboard/DashboardParser';
import { DashboardConfig, TasksDashboardSettings } from '../types';
import {
	getDashboardIssuesFolderPath,
	getDashboardPath,
	resolveCollapsedDashboardSettingsMap
} from './settings-helpers';

export async function collectDashboardIssueIds(
	app: App,
	dashboard: DashboardConfig
): Promise<string[]> {
	const dashboardPath = getDashboardPath(dashboard);
	const file = app.vault.getAbstractFileByPath(dashboardPath);

	if (!(file instanceof TFile)) {
		return [];
	}

	try {
		const content = await app.vault.cachedRead(file);
		const parsed = parseDashboard(content);
		const activeIds = parsed.activeIssues.map((issue) => issue.id);
		const archivedIds = parsed.archivedIssues.map((issue) => issue.id);
		return [...activeIds, ...archivedIds];
	} catch {
		return [];
	}
}

export function cleanupDashboardSettingData(
	settings: TasksDashboardSettings,
	dashboard: DashboardConfig,
	issueIds: string[]
): void {
	for (const issueId of issueIds) {
		delete settings.collapsedIssues[issueId];
		delete settings.issueColors[issueId];
	}

	const issueFolderPrefix = dashboard.id + ':';
	for (const key of Object.keys(settings.issueFolders)) {
		if (key.startsWith(issueFolderPrefix)) {
			delete settings.issueFolders[key];
		}
	}

	const collapsedDashboardSettings = resolveCollapsedDashboardSettingsMap(settings);
	delete collapsedDashboardSettings[dashboard.id];
}

export async function trashDashboardFiles(app: App, dashboard: DashboardConfig): Promise<void> {
	const dashboardPath = getDashboardPath(dashboard);
	const issuesFolderPath = getDashboardIssuesFolderPath(dashboard);

	const dashboardFile = app.vault.getAbstractFileByPath(dashboardPath);
	if (dashboardFile instanceof TFile) {
		try {
			await app.vault.trash(dashboardFile, true);
		} catch {
			new Notice(`Could not delete dashboard file: ${dashboardPath}`);
		}
	}

	const issuesFolder = app.vault.getAbstractFileByPath(issuesFolderPath);
	if (issuesFolder instanceof TFolder) {
		try {
			await app.vault.trash(issuesFolder, true);
		} catch {
			new Notice(`Could not delete Issues folder: ${issuesFolderPath}`);
		}
	}
}

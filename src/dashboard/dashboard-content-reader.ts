import { TFile } from 'obsidian';
import type { App } from 'obsidian';
import type { DashboardConfig } from '../types';
import { parseDashboard, type ParsedDashboard } from './DashboardParser';

export interface DashboardContent {
	content: string;
	parsed: ParsedDashboard;
}

export async function readDashboardContent(
	app: App,
	dashboard: DashboardConfig
): Promise<DashboardContent | undefined> {
	const filename = dashboard.dashboardFilename || 'Dashboard.md';
	const dashboardPath = `${dashboard.rootPath}/${filename}`;
	const file = app.vault.getAbstractFileByPath(dashboardPath);
	if (!(file instanceof TFile)) {
		return undefined;
	}
	const content = await app.vault.read(file);
	const parsed = parseDashboard(content);
	return { content, parsed };
}

export async function getDashboardIssueIds(
	app: App,
	dashboard: DashboardConfig
): Promise<string[]> {
	const dashboardData = await readDashboardContent(app, dashboard);
	if (dashboardData === undefined) {
		return [];
	}
	const { parsed } = dashboardData;
	return [
		...parsed.activeIssues.map((issue) => issue.id),
		...parsed.archivedIssues.map((issue) => issue.id)
	];
}

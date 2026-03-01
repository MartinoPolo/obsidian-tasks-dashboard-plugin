import { App, TFile } from 'obsidian';
import { DashboardConfig, IssueStatus } from '../types';

export function findIssueFilesByPath(app: App, basePath: string, issueId: string): TFile[] {
	return app.vault
		.getFiles()
		.filter((f) => f.path.startsWith(basePath) && f.basename.startsWith(issueId));
}

export function escapeForRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getFrontmatterCloseIndex(content: string): number {
	const openIndex = content.indexOf('---');
	if (openIndex === -1) {
		return -1;
	}

	return content.indexOf('---', openIndex + 3);
}

export function appendBeforeFrontmatterClose(content: string, section: string): string {
	const frontmatterCloseIndex = getFrontmatterCloseIndex(content);
	if (frontmatterCloseIndex === -1) {
		return content;
	}

	return (
		content.slice(0, frontmatterCloseIndex) +
		section +
		'\n' +
		content.slice(frontmatterCloseIndex)
	);
}

export function getDashboardFilename(dashboard: DashboardConfig): string {
	return dashboard.dashboardFilename || 'Dashboard.md';
}

export function getIssueFolderName(status: IssueStatus): string {
	return status === 'active' ? 'Active' : 'Archive';
}

export function getIssueFolderStorageKey(dashboardId: string, issueId: string): string {
	return `${dashboardId}:${issueId}`;
}

import type { TasksDashboardSettings } from '../types';
import { getIssueFolderStorageKey } from './issue-manager-shared';

export function removeIssueSettings(
	settings: TasksDashboardSettings,
	dashboardId: string,
	issueId: string
): boolean {
	let settingsChanged = false;

	if (issueId in settings.collapsedIssues) {
		delete settings.collapsedIssues[issueId];
		settingsChanged = true;
	}

	if (issueId in settings.issueColors) {
		delete settings.issueColors[issueId];
		settingsChanged = true;
	}

	const issueFolderKey = getIssueFolderStorageKey(dashboardId, issueId);
	if (issueFolderKey in settings.issueFolders) {
		delete settings.issueFolders[issueFolderKey];
		settingsChanged = true;
	}

	return settingsChanged;
}

export function migrateIssueSettings(
	settings: TasksDashboardSettings,
	dashboardId: string,
	oldIssueId: string,
	newIssueId: string
): boolean {
	let settingsChanged = false;

	if (oldIssueId in settings.collapsedIssues) {
		settings.collapsedIssues[newIssueId] = settings.collapsedIssues[oldIssueId];
		delete settings.collapsedIssues[oldIssueId];
		settingsChanged = true;
	}

	if (oldIssueId in settings.issueColors) {
		settings.issueColors[newIssueId] = settings.issueColors[oldIssueId];
		delete settings.issueColors[oldIssueId];
		settingsChanged = true;
	}

	const oldFolderKey = getIssueFolderStorageKey(dashboardId, oldIssueId);
	const newFolderKey = getIssueFolderStorageKey(dashboardId, newIssueId);
	if (oldFolderKey in settings.issueFolders) {
		settings.issueFolders[newFolderKey] = settings.issueFolders[oldFolderKey];
		delete settings.issueFolders[oldFolderKey];
		settingsChanged = true;
	}

	return settingsChanged;
}

export function recordDeletedIssueGitHubUrls(
	settings: TasksDashboardSettings,
	dashboardId: string,
	githubUrls: string[]
): boolean {
	if (githubUrls.length === 0) {
		return false;
	}
	const existing = settings.deletedIssueGitHubUrls[dashboardId] ?? [];
	const combined = new Set([...existing, ...githubUrls]);
	if (combined.size === existing.length) {
		return false;
	}
	settings.deletedIssueGitHubUrls[dashboardId] = Array.from(combined);
	return true;
}

export function removeDeletedIssueGitHubUrl(
	settings: TasksDashboardSettings,
	dashboardId: string,
	url: string
): boolean {
	const existing = settings.deletedIssueGitHubUrls[dashboardId] ?? [];
	if (existing.length === 0) {
		return false;
	}
	const filtered = existing.filter((storedUrl) => storedUrl !== url);
	if (filtered.length === existing.length) {
		return false;
	}
	if (filtered.length === 0) {
		delete settings.deletedIssueGitHubUrls[dashboardId];
	} else {
		settings.deletedIssueGitHubUrls[dashboardId] = filtered;
	}
	return true;
}

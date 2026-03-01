import type { DashboardConfig } from '../types';

const DEFAULT_DASHBOARD_FILENAME = 'Dashboard.md';

function isNonEmptyString(value: string | undefined): value is string {
	return value !== undefined && value !== '';
}

function getDashboardFilename(dashboardFilename: string | undefined): string {
	if (!isNonEmptyString(dashboardFilename)) {
		return DEFAULT_DASHBOARD_FILENAME;
	}

	return dashboardFilename;
}

function removeMarkdownExtension(filename: string): string {
	return filename.replace(/\.md$/, '');
}

function getPathSegments(path: string | undefined): string[] {
	if (!isNonEmptyString(path)) {
		return [];
	}

	return path.split('/').filter(Boolean);
}

function getLastPathSegment(path: string | undefined): string | undefined {
	const segments = getPathSegments(path);
	return segments.at(-1);
}

export function getDashboardPath(dashboard: DashboardConfig): string {
	const filename = getDashboardFilename(dashboard.dashboardFilename);
	return `${dashboard.rootPath}/${filename}`;
}

export function getDashboardDisplayName(dashboard: DashboardConfig): string {
	const filename = removeMarkdownExtension(getDashboardFilename(dashboard.dashboardFilename));
	const parentFolder = getLastPathSegment(dashboard.rootPath);

	if (isNonEmptyString(parentFolder)) {
		return `${parentFolder}/${filename}`;
	}

	return filename;
}

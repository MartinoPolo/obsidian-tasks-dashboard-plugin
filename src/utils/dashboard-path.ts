import { DEFAULT_DASHBOARD_FILENAME } from '../settings/settings-options';
import type { DashboardConfig } from '../types';
import { isNonEmptyString } from './string-utils';

function resolveDashboardFilename(dashboardFilename: string | undefined): string {
	if (!isNonEmptyString(dashboardFilename)) {
		return DEFAULT_DASHBOARD_FILENAME;
	}

	return dashboardFilename;
}

export function getDashboardFilename(dashboard: DashboardConfig): string {
	return resolveDashboardFilename(dashboard.dashboardFilename);
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
	const filename = resolveDashboardFilename(dashboard.dashboardFilename);
	return `${dashboard.rootPath}/${filename}`;
}

export function getDashboardDisplayName(dashboard: DashboardConfig): string {
	const filename = removeMarkdownExtension(resolveDashboardFilename(dashboard.dashboardFilename));
	const parentFolder = getLastPathSegment(dashboard.rootPath);

	if (isNonEmptyString(parentFolder)) {
		return `${parentFolder}/${filename}`;
	}

	return filename;
}

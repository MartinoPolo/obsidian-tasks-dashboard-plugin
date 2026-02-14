import { DashboardConfig } from '../types';

export function getDashboardPath(dashboard: DashboardConfig): string {
	const filename = dashboard.dashboardFilename || 'Dashboard.md';
	return `${dashboard.rootPath}/${filename}`;
}

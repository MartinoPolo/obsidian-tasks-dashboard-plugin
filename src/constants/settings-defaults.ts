import type { TasksDashboardSettings } from '../types';

export const DEFAULT_SETTINGS: TasksDashboardSettings = {
	dashboards: [],
	progressDisplayMode: 'all',
	githubAuth: { method: 'none' },
	githubDisplayMode: 'compact',
	collapsedIssues: {},
	collapsedDashboardSettings: {},
	issueColors: {},
	issueFolders: {}
};
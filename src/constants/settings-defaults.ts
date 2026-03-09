import type { TasksDashboardSettings } from '../types';

export const DEFAULT_SETTINGS: TasksDashboardSettings = {
	dashboards: [],
	progressDisplayMode: 'all',
	githubAuth: { method: 'none' },
	githubDisplayMode: 'compact',
	deleteIssueRemoveWorktreeByDefault: true,
	worktreeBashPath: undefined,
	collapsedIssues: {},
	collapsedDashboardSettings: {},
	issueColors: {},
	issueFolders: {}
};

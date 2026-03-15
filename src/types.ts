export type Priority = 'low' | 'medium' | 'high' | 'top';
export type IssueStatus = 'active' | 'archived';
export type WorktreeSetupState = 'pending' | 'active' | 'failed';
export type ProgressDisplayMode = 'number' | 'percentage' | 'bar' | 'number-percentage' | 'all';
export type GitHubAuthMethod = 'none' | 'pat';
export type GitHubDisplayMode = 'minimal' | 'compact' | 'full';
export type GitHubSearchScope = 'linked-dashboard' | 'linked-issue' | 'my-repos' | 'other-repo';
export type IssueActionKey =
	| 'folder'
	| 'terminal'
	| 'vscode'
	| 'github'
	| 'worktree'
	| 'move-up'
	| 'move-down'
	| 'move-top'
	| 'move-bottom'
	| 'rename'
	| 'change-priority'
	| 'color'
	| 'archive'
	| 'delete';

export interface DashboardIssueActionLayout {
	row1: IssueActionKey[];
	row2: IssueActionKey[];
	hidden: IssueActionKey[];
}

export interface GitHubAuth {
	method: GitHubAuthMethod;
	token?: string;
	username?: string;
}

export interface GitHubLabel {
	name: string;
	color: string;
}

export interface GitHubRepository {
	fullName: string;
	description: string;
	isPrivate: boolean;
}

export interface GitHubRepoMetadata {
	fullName: string;
	owner: string;
	repo: string;
	description: string;
	url: string;
	stars: number;
	language: string;
	forksCount: number;
	openIssuesCount: number;
	isPrivate: boolean;
	updatedAt: string;
}

export interface GitHubRateLimit {
	limit: number;
	remaining: number;
	resetTimestamp: number;
}

export interface GitHubIssueMetadata {
	number: number;
	title: string;
	state: 'open' | 'closed';
	labels: GitHubLabel[];
	assignees: string[];
	body?: string;
	createdAt: string;
	updatedAt: string;
	repository: string;
	url: string;
	isPR: boolean;
	prStatus?: 'merged' | 'draft' | 'open' | 'closed' | 'review-requested';
}

export interface GitHubStoredMetadata {
	url: string;
	number: number;
	state: 'open' | 'closed';
	title: string;
	labels: string[];
	lastFetched: string;
}
export interface Issue {
	id: string;
	name: string;
	priority: Priority;
	status: IssueStatus;
	created: string;
	worktree?: boolean;
	worktreeBranch?: string;
	worktreeOriginFolder?: string;
	worktreeExpectedFolder?: string;
	worktreeSetupState?: WorktreeSetupState;
	worktreeBaseRepository?: string;
	worktreeBaseBranch?: string;
	worktreeSafeDelete?: boolean;
	/** @deprecated Use githubLinks instead. Kept for backward compatibility during migration. */
	githubLink?: string;
	/** @deprecated Use githubMetadataList instead. Kept for backward compatibility during migration. */
	githubMetadata?: GitHubStoredMetadata;
	githubLinks?: string[];
	githubMetadataList?: GitHubStoredMetadata[];
	filePath: string;
}

export interface DashboardConfig {
	id: string;
	rootPath: string;
	dashboardFilename: string;
	/** @deprecated Use githubRepos instead. Kept for backward compatibility during migration. */
	githubRepo?: string;
	githubRepos?: string[];
	githubEnabled: boolean;
	projectFolder?: string;
	showGitHubButtons?: boolean;
	showFolderButtons?: boolean;
	showTerminalButtons?: boolean;
	showVSCodeButtons?: boolean;
	issueActionLayout?: DashboardIssueActionLayout;
	prioritiesEnabled?: boolean;
}

export interface TasksDashboardSettings {
	dashboards: DashboardConfig[];
	progressDisplayMode: ProgressDisplayMode;
	githubAuth: GitHubAuth;
	githubDisplayMode: GitHubDisplayMode;
	deleteIssueRemoveWorktreeByDefault: boolean;
	worktreeBashPath?: string;
	worktreeSetupScriptPath?: string;
	worktreeRemoveScriptPath?: string;
	collapsedIssues: Record<string, boolean>;
	collapsedDashboardSettings: Record<string, boolean>;
	issueColors: Record<string, string>;
	issueFolders: Record<string, string>;
	lastUsedColorIndex?: number;
}
export interface IssueProgress {
	done: number;
	total: number;
	percentage: number;
}

export { DEFAULT_SETTINGS } from './constants/settings-defaults';
export { getDashboardDisplayName } from './utils/dashboard-path';
export { PRIORITY_ORDER } from './utils/priorities';

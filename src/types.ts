export type Priority = 'low' | 'medium' | 'high' | 'top';
export type IssueStatus = 'active' | 'archived';
export type ProgressDisplayMode = 'number' | 'percentage' | 'bar' | 'number-percentage' | 'all';
export type GitHubAuthMethod = 'none' | 'pat';
export type GitHubDisplayMode = 'minimal' | 'compact' | 'full';
export type GitHubSearchScope = 'linked' | 'my-repos' | 'all-github';

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
	prStatus?: 'merged' | 'draft' | 'open' | 'closed';
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
	githubRepo?: string;
	githubEnabled: boolean;
	projectFolder?: string;
	showGitHubButtons?: boolean;
	showFolderButtons?: boolean;
	showTerminalButtons?: boolean;
	showVSCodeButtons?: boolean;
}

export interface TasksDashboardSettings {
	dashboards: DashboardConfig[];
	progressDisplayMode: ProgressDisplayMode;
	githubAuth: GitHubAuth;
	githubDisplayMode: GitHubDisplayMode;
	collapsedIssues: Record<string, boolean>;
	collapsedDashboardSettings: Record<string, boolean>;
	issueColors: Record<string, string>;
	issueFolders: Record<string, string>;
}
export interface IssueProgress {
	done: number;
	total: number;
	percentage: number;
}

export { getDashboardDisplayName } from './utils/dashboard-path';
export { DEFAULT_SETTINGS } from './constants/settings-defaults';
export { PRIORITY_ORDER } from './utils/priorities';

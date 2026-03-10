import { DashboardConfig, Issue, Priority, WorktreeSetupState } from '../types';

export type SortDirection = 'newest' | 'oldest';

export interface DashboardWriterInstance {
	addIssueToDashboard: (dashboard: DashboardConfig, issue: Issue) => Promise<void>;
	moveIssueToArchive: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	moveIssueToActive: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	removeIssueFromDashboard: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	moveIssue: (
		dashboard: DashboardConfig,
		issueId: string,
		direction: 'up' | 'down'
	) => Promise<void>;
	moveIssueToPosition: (
		dashboard: DashboardConfig,
		issueId: string,
		position: 'top' | 'bottom'
	) => Promise<void>;
	sortByPriority: (dashboard: DashboardConfig) => Promise<void>;
	sortByCreatedDate: (dashboard: DashboardConfig, direction: SortDirection) => Promise<void>;
	sortByEditedDate: (dashboard: DashboardConfig, direction: SortDirection) => Promise<void>;
	sortByWorktreeFolder: (dashboard: DashboardConfig) => Promise<void>;
	sortByPrState: (dashboard: DashboardConfig) => Promise<void>;
	rebuildDashboardFromFiles: (dashboard: DashboardConfig) => Promise<number>;
}

export interface IssueBlockParams {
	id: string;
	name: string;
	filePath: string;
	dashboardId: string;
	priority: Priority;
	githubLinks: string[];
	worktree: boolean;
	worktreeBranch?: string;
	worktreeOriginFolder?: string;
	worktreeExpectedFolder?: string;
	worktreeSetupState?: WorktreeSetupState;
	worktreeBaseRepository?: string;
	worktreeBaseBranch?: string;
	worktreeSafeDelete?: boolean;
	isArchived: boolean;
}

export interface ParsedIssueFile {
	id: string;
	name: string;
	priority: Priority;
	created: string;
	filePath: string;
	githubLinks: string[];
	worktree: boolean;
	worktreeBranch?: string;
	worktreeOriginFolder?: string;
	worktreeExpectedFolder?: string;
	worktreeSetupState?: WorktreeSetupState;
	worktreeBaseRepository?: string;
	worktreeBaseBranch?: string;
	worktreeSafeDelete?: boolean;
}

export interface ParsedDashboardIssue {
	id: string;
	priority: Priority;
	startIndex: number;
	endIndex: number;
	filePath: string;
}

export interface ExtractedIssueBlock {
	block: string;
	cleanedContent: string;
}

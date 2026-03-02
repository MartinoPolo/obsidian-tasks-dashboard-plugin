import { TFile } from 'obsidian';
import { DashboardConfig, GitHubIssueMetadata, Issue, Priority } from '../types';

export interface CreateIssueParams {
	name: string;
	priority: Priority;
	worktree?: boolean;
	worktreeColor?: string;
	worktreeOriginFolder?: string;
	githubLink?: string;
	githubMetadata?: GitHubIssueMetadata;
	dashboard: DashboardConfig;
}

export interface ImportNoteParams {
	file: TFile;
	priority: Priority;
	dashboard: DashboardConfig;
}

export interface RemoveWorktreeOptions {
	skipScriptConfirmation?: boolean;
}

export interface IssueManagerInstance {
	createIssue: (params: CreateIssueParams) => Promise<Issue>;
	importNoteAsIssue: (params: ImportNoteParams) => Promise<Issue>;
	hasAssociatedWorktree: (dashboard: DashboardConfig, issueId: string) => Promise<boolean>;
	archiveIssue: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	unarchiveIssue: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	deleteIssue: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	updateIssuePriority: (
		dashboard: DashboardConfig,
		issueId: string,
		priority: Priority
	) => Promise<void>;
	renameIssue: (dashboard: DashboardConfig, oldIssueId: string, newName: string) => Promise<void>;
	setupWorktree: (
		dashboard: DashboardConfig,
		issueId: string,
		issueName: string,
		color?: string,
		worktreeOriginFolder?: string
	) => void;
	removeWorktree: (
		dashboard: DashboardConfig,
		issueId: string,
		options?: RemoveWorktreeOptions
	) => void;
	addGitHubLink: (
		dashboard: DashboardConfig,
		issueId: string,
		githubUrl: string,
		metadata?: GitHubIssueMetadata
	) => Promise<void>;
	removeGitHubLink: (
		dashboard: DashboardConfig,
		issueId: string,
		githubUrl: string
	) => Promise<void>;
}
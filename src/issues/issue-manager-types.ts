import { TFile } from 'obsidian';
import { DashboardConfig, GitHubIssueMetadata, Issue, Priority } from '../types';

export interface CreateIssueParams {
	name: string;
	priority: Priority;
	githubLink?: string;
	githubMetadata?: GitHubIssueMetadata;
	dashboard: DashboardConfig;
}

export interface ImportNoteParams {
	file: TFile;
	priority: Priority;
	dashboard: DashboardConfig;
}

export interface IssueManagerInstance {
	createIssue: (params: CreateIssueParams) => Promise<Issue>;
	importNoteAsIssue: (params: ImportNoteParams) => Promise<Issue>;
	archiveIssue: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	unarchiveIssue: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	deleteIssue: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	renameIssue: (dashboard: DashboardConfig, oldIssueId: string, newName: string) => Promise<void>;
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
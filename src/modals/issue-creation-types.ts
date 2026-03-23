import type { GitHubIssueMetadata, Priority } from '../types';

export type IssueCreationMode = 'standard' | 'worktree';

export interface WorktreeCreationContext {
	eligible: boolean;
	worktreeOriginFolder?: string;
	worktreeScriptDirectory?: string;
	sourceIssueLinkedRepository?: string;
}

export interface GitHubSelectionContext {
	githubLink?: string;
	githubMetadata?: GitHubIssueMetadata;
}

export interface IssueCreateRequest {
	name: string;
	priority: Priority;
	color: string;
	mode: IssueCreationMode;
	worktreeOriginFolder?: string;
	worktreeScriptDirectory?: string;
	sourceIssueLinkedRepository?: string;
	githubLink?: string;
	githubMetadata?: GitHubIssueMetadata;
}

export interface QuickCreateDefaults {
	priority: Priority;
	color: string;
	worktree: boolean;
	worktreeOriginFolder?: string;
	worktreeBaseRepository?: string;
}

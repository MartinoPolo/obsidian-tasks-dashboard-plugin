import { App, Notice } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { getErrorMessage } from '../settings/settings-helpers';
import { DashboardConfig, GitHubIssueMetadata, GitHubRepository, Priority } from '../types';
import { getGitHubLinkType } from '../utils/github';
import { parseGitHubRepoFullName, parseGitHubUrl } from '../utils/github-url';
import { findIssueColorPaletteIndex } from '../utils/issue-colors';
import { openFileAndFocusEnd } from './open-file-and-focus';
import type { IssueCreationMode, QuickCreateDefaults } from './issue-creation-types';

interface CreateIssueRequest {
	name: string;
	priority: Priority;
	dashboard: DashboardConfig;
	color?: string;
	worktree?: boolean;
	worktreeOriginFolder?: string;
	worktreeScriptDirectory?: string;
	worktreeBaseRepository?: string;
	githubLink?: string;
	githubMetadata?: GitHubIssueMetadata;
}

export function getIssueLinkedRepositoryFromLinks(
	githubLinks: string[] | undefined
): string | undefined {
	if (githubLinks === undefined || githubLinks.length === 0) {
		return undefined;
	}

	for (const link of githubLinks) {
		if (getGitHubLinkType(link) !== 'repository') {
			continue;
		}

		const repository = parseGitHubRepoFullName(link);
		if (repository !== undefined && repository !== '') {
			return repository;
		}
	}

	for (const link of githubLinks) {
		const parsed = parseGitHubUrl(link);
		if (parsed !== undefined) {
			return `${parsed.owner}/${parsed.repo}`;
		}
	}

	return undefined;
}

export async function createIssueWithNotice(
	app: App,
	plugin: TasksDashboardPlugin,
	request: CreateIssueRequest
): Promise<void> {
	try {
		const issue = await plugin.issueManager.createIssue({
			...request,
			worktreeColor: request.color
		});
		if (request.color !== undefined) {
			plugin.settings.issueColors[issue.id] = request.color;
			const paletteIndex = findIssueColorPaletteIndex(request.color);
			if (paletteIndex >= 0) {
				plugin.settings.lastUsedColorIndex = paletteIndex;
			}
			await plugin.saveSettings();
		}
		if (request.worktree === true) {
			void plugin.issueManager.setupWorktree(
				request.dashboard,
				issue.id,
				request.name,
				request.color,
				request.worktreeOriginFolder,
				request.worktreeScriptDirectory
			);
		}
		new Notice(`Created issue: ${request.name}`);
		await openFileAndFocusEnd(app, issue.filePath);
	} catch (error) {
		new Notice(`Error creating issue: ${getErrorMessage(error)}`);
	}
}

export function getPrefilledIssueName(
	metadata: GitHubIssueMetadata | undefined
): string | undefined {
	if (metadata === undefined) {
		return undefined;
	}

	const firstFourWords = metadata.title
		.trim()
		.split(/\s+/)
		.filter((word) => word !== '')
		.slice(0, 4)
		.join(' ');
	return firstFourWords === '' ? `${metadata.number}` : `${metadata.number} ${firstFourWords}`;
}

export interface AssignedIssueCreationOptions {
	dashboard: DashboardConfig;
	githubMetadata: GitHubIssueMetadata;
	githubUrl: string;
	quickCreateDefaults?: QuickCreateDefaults;
}

export async function createIssueWithRepoLink(
	app: App,
	plugin: TasksDashboardPlugin,
	dashboard: DashboardConfig,
	issueName: string,
	priority: Priority,
	repository: GitHubRepository,
	color?: string,
	mode: IssueCreationMode = 'standard',
	worktreeOriginFolder?: string,
	worktreeBaseRepository?: string
): Promise<void> {
	const repoUrl = `https://github.com/${repository.fullName}`;
	await createIssueWithNotice(app, plugin, {
		name: issueName,
		priority,
		githubLink: repoUrl,
		color,
		worktree: mode === 'worktree',
		worktreeOriginFolder,
		worktreeBaseRepository,
		dashboard
	});
}

export async function createIssueWithGitHub(
	app: App,
	plugin: TasksDashboardPlugin,
	dashboard: DashboardConfig,
	issueName: string,
	priority: Priority,
	githubUrl?: string,
	githubMetadata?: GitHubIssueMetadata,
	color?: string,
	mode: IssueCreationMode = 'standard',
	worktreeOriginFolder?: string,
	worktreeBaseRepository?: string,
	worktreeScriptDirectory?: string
): Promise<void> {
	await createIssueWithNotice(app, plugin, {
		name: issueName,
		priority,
		githubLink: githubUrl,
		githubMetadata,
		color,
		worktree: mode === 'worktree',
		worktreeOriginFolder,
		worktreeScriptDirectory,
		worktreeBaseRepository,
		dashboard
	});
}

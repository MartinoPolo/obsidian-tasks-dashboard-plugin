import { App, Notice, TFile } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, Issue, IssueStatus, GitHubIssueMetadata } from '../types';
import { slugify } from '../utils/slugify';
import { getDashboardPath } from '../utils/dashboard-path';
import {
	findIssueFilesByPath,
	getDashboardFilename,
	getIssueFolderName,
	getIssueFolderStorageKey
} from './issue-manager-shared';
import {
	generateIssueContent,
	removeGitHubLinkFromDashboardIssueBlock,
	removeGitHubLinkFromIssueContent,
	toStoredGitHubMetadata,
	updateBodyWithGitHubLink,
	updateFrontmatterWithGitHubLink
} from './issue-manager-github';
import { migrateIssueSettings, removeIssueSettings } from './issue-manager-settings';
import { CreateIssueParams, ImportNoteParams, IssueManagerInstance } from './issue-manager-types';

export type { CreateIssueParams, ImportNoteParams, IssueManagerInstance };

export function createIssueManager(app: App, plugin: TasksDashboardPlugin): IssueManagerInstance {
	const activeOperationLocks = new Set<string>();

	const acquireOperationLock = (dashboardId: string, issueId: string): boolean => {
		const lockKey = getIssueFolderStorageKey(dashboardId, issueId);
		if (activeOperationLocks.has(lockKey)) {
			return false;
		}
		activeOperationLocks.add(lockKey);
		return true;
	};

	const releaseOperationLock = (dashboardId: string, issueId: string): void => {
		activeOperationLocks.delete(getIssueFolderStorageKey(dashboardId, issueId));
	};

	const withIssueOperationLock = async (
		dashboardId: string,
		issueId: string,
		operation: () => Promise<void>
	): Promise<void> => {
		if (!acquireOperationLock(dashboardId, issueId)) {
			new Notice(`Operation already in progress for ${issueId}`);
			return;
		}

		try {
			await operation();
		} finally {
			releaseOperationLock(dashboardId, issueId);
		}
	};

	const getIssuePathByStatus = (dashboard: DashboardConfig, status: IssueStatus): string => {
		const folderName = getIssueFolderName(status);
		return `${dashboard.rootPath}/Issues/${folderName}`;
	};

	const getFileByPath = (path: string): TFile | undefined => {
		const abstractFile = app.vault.getAbstractFileByPath(path);
		if (abstractFile instanceof TFile) {
			return abstractFile;
		}
		return undefined;
	};

	const getDashboardFile = (dashboard: DashboardConfig): TFile | undefined => {
		return getFileByPath(getDashboardPath(dashboard));
	};

	const ensureFolderExists = async (path: string): Promise<void> => {
		const existingPath = app.vault.getAbstractFileByPath(path);
		if (existingPath === null) {
			await app.vault.createFolder(path);
		}
	};

	const generateUniqueFilePath = (basePath: string, slug: string): string => {
		let candidate = `${basePath}/${slug}.md`;
		let counter = 1;
		while (app.vault.getAbstractFileByPath(candidate) !== null) {
			candidate = `${basePath}/${slug}-${counter}.md`;
			counter++;
		}
		return candidate;
	};


	const findIssueFileInStatus = (
		dashboard: DashboardConfig,
		issueId: string,
		status: IssueStatus
	): TFile | undefined => {
		const folderPath = getIssuePathByStatus(dashboard, status);
		const matchingFiles = findIssueFilesByPath(app, folderPath, issueId);
		return matchingFiles.at(0);
	};

	const editDashboardIssueBlock = async (
		dashboard: DashboardConfig,
		issueId: string,
		transformBlock: (block: string) => string
	): Promise<void> => {
		const dashboardFile = getDashboardFile(dashboard);
		if (dashboardFile === undefined) {
			return;
		}

		let dashboardContent = await app.vault.read(dashboardFile);
		const startMarker = `%% ISSUE:${issueId}:START %%`;
		const endMarker = `%% ISSUE:${issueId}:END %%`;
		const startIndex = dashboardContent.indexOf(startMarker);
		const endIndex = dashboardContent.indexOf(endMarker);

		if (startIndex === -1 || endIndex === -1) {
			return;
		}

		const blockEnd = endIndex + endMarker.length;
		const originalBlock = dashboardContent.substring(startIndex, blockEnd);
		const updatedBlock = transformBlock(originalBlock);

		if (updatedBlock === originalBlock) {
			return;
		}

		dashboardContent =
			dashboardContent.slice(0, startIndex) + updatedBlock + dashboardContent.slice(blockEnd);
		await app.vault.modify(dashboardFile, dashboardContent);
	};

	const moveIssueState = async (
		dashboard: DashboardConfig,
		issueId: string,
		fromStatus: IssueStatus,
		toStatus: IssueStatus,
		onDashboardMove: (dashboardConfig: DashboardConfig, id: string) => Promise<void>,
		noticeMessage: string
	): Promise<void> => {
		const issueFile = findIssueFileInStatus(dashboard, issueId, fromStatus);
		if (issueFile === undefined) {
			throw new Error(`Issue not found: ${issueId}`);
		}

		let content = await app.vault.read(issueFile);
		content = content.replace(
			new RegExp(`^status:\\s*${fromStatus}`, 'm'),
			`status: ${toStatus}`
		);
		await app.vault.modify(issueFile, content);

		const destinationPath = `${getIssuePathByStatus(dashboard, toStatus)}/${issueFile.name}`;
		await app.vault.rename(issueFile, destinationPath);
		await onDashboardMove(dashboard, issueId);

		new Notice(`${noticeMessage}: ${issueId}`);
	};

	const createIssue = async (params: CreateIssueParams): Promise<Issue> => {
		const { name, priority, githubLink, githubMetadata, dashboard } = params;
		const issueId = slugify(name);
		const activePath = getIssuePathByStatus(dashboard, 'active');

		await ensureFolderExists(activePath);

		const filePath = generateUniqueFilePath(activePath, issueId);
		const created = new Date().toISOString();
		const storedMetadata = toStoredGitHubMetadata(githubMetadata);

		const githubLinks = githubLink !== undefined && githubLink !== '' ? [githubLink] : [];
		const githubMetadataList = storedMetadata !== undefined ? [storedMetadata] : [];

		const issue: Issue = {
			id: issueId,
			name,
			priority,
			status: 'active',
			created,
			githubLink,
			githubMetadata: storedMetadata,
			githubLinks,
			githubMetadataList,
			filePath
		};

		const content = generateIssueContent(issue, dashboard);
		await app.vault.create(filePath, content);
		await plugin.dashboardWriter.addIssueToDashboard(dashboard, issue);

		return issue;
	};

	const importNoteAsIssue = async (params: ImportNoteParams): Promise<Issue> => {
		const { file, priority, dashboard } = params;
		const name = file.basename;
		const issueId = slugify(name);
		const activePath = getIssuePathByStatus(dashboard, 'active');

		await ensureFolderExists(activePath);

		const filePath = generateUniqueFilePath(activePath, issueId);
		const created = new Date().toISOString();
		const dashboardFilename = getDashboardFilename(dashboard);
		const relativePath = '../'.repeat(2) + encodeURI(dashboardFilename);

		// Read original note content — original stays untouched
		const originalContent = await app.vault.read(file);

		// Extract and merge frontmatter from original
		let originalBody = originalContent;
		let originalFrontmatterFields = '';
		const frontmatterMatch = originalContent.match(/^---\n([\s\S]*?)\n---/);
		if (frontmatterMatch !== null) {
			const originalFields = frontmatterMatch[1];
			// Filter out fields we'll set ourselves
			const ownFields = new Set(['created', 'status', 'priority']);
			const preservedLines = originalFields
				.split('\n')
				.filter((line) => {
					const key = line.match(/^(\w+):/);
					return key === null || !ownFields.has(key[1]);
				})
				.join('\n');
			if (preservedLines.trim() !== '') {
				originalFrontmatterFields = '\n' + preservedLines;
			}
			originalBody = originalContent.slice(frontmatterMatch[0].length).trimStart();
		}

		const newContent = `---
created: ${created}
status: active
priority: ${priority}${originalFrontmatterFields}
---
[← Back to Dashboard](${relativePath})

${originalBody}`;

		await app.vault.create(filePath, newContent);

		const issue: Issue = {
			id: issueId,
			name,
			priority,
			status: 'active',
			created,
			githubLinks: [],
			githubMetadataList: [],
			filePath
		};

		await plugin.dashboardWriter.addIssueToDashboard(dashboard, issue);

		return issue;
	};

	const findIssueFile = (
		dashboard: DashboardConfig,
		issueId: string
	): { file: TFile; status: IssueStatus } | undefined => {
		const activeFile = findIssueFileInStatus(dashboard, issueId, 'active');
		if (activeFile !== undefined) {
			return { file: activeFile, status: 'active' };
		}

		const archivedFile = findIssueFileInStatus(dashboard, issueId, 'archived');
		if (archivedFile !== undefined) {
			return { file: archivedFile, status: 'archived' };
		}

		return undefined;
	};

	const getIssueFileOrThrow = (
		dashboard: DashboardConfig,
		issueId: string
	): { file: TFile; status: IssueStatus } => {
		const issueResult = findIssueFile(dashboard, issueId);
		if (issueResult === undefined) {
			throw new Error(`Issue not found: ${issueId}`);
		}

		return issueResult;
	};

	const archiveIssue = async (dashboard: DashboardConfig, issueId: string): Promise<void> => {
		await withIssueOperationLock(dashboard.id, issueId, async () => {
			await ensureFolderExists(getIssuePathByStatus(dashboard, 'archived'));
			await moveIssueState(
				dashboard,
				issueId,
				'active',
				'archived',
				plugin.dashboardWriter.moveIssueToArchive,
				'Archived'
			);
		});
	};

	const unarchiveIssue = async (dashboard: DashboardConfig, issueId: string): Promise<void> => {
		await withIssueOperationLock(dashboard.id, issueId, async () => {
			await ensureFolderExists(getIssuePathByStatus(dashboard, 'active'));
			await moveIssueState(
				dashboard,
				issueId,
				'archived',
				'active',
				plugin.dashboardWriter.moveIssueToActive,
				'Unarchived'
			);
		});
	};

	const deleteIssue = async (dashboard: DashboardConfig, issueId: string): Promise<void> => {
		const { file } = getIssueFileOrThrow(dashboard, issueId);

		await plugin.dashboardWriter.removeIssueFromDashboard(dashboard, issueId);

		// Use system trash for recoverability
		await app.vault.trash(file, true);

		const settingsChanged = removeIssueSettings(plugin.settings, dashboard.id, issueId);
		if (settingsChanged) {
			void plugin.saveSettings();
		}

		new Notice(`Deleted: ${issueId}`);
	};

	const renameIssue = async (
		dashboard: DashboardConfig,
		oldIssueId: string,
		newName: string
	): Promise<void> => {
		const newIssueId = slugify(newName);

		if (newIssueId === oldIssueId) {
			return;
		}

		const { file, status } = getIssueFileOrThrow(dashboard, oldIssueId);
		const folder = getIssueFolderName(status);
		const newPath = `${dashboard.rootPath}/Issues/${folder}/${newIssueId}.md`;

		if (app.vault.getAbstractFileByPath(newPath) !== null) {
			throw new Error(`An issue with name "${newName}" already exists`);
		}

		await editDashboardIssueBlock(dashboard, oldIssueId, (block) => {
			let updatedBlock = block;
			updatedBlock = updatedBlock.replace(
				`%% ISSUE:${oldIssueId}:START %%`,
				`%% ISSUE:${newIssueId}:START %%`
			);
			updatedBlock = updatedBlock.replace(
				`%% ISSUE:${oldIssueId}:END %%`,
				`%% ISSUE:${newIssueId}:END %%`
			);
			updatedBlock = updatedBlock.replace(`issue: ${oldIssueId}`, `issue: ${newIssueId}`);
			updatedBlock = updatedBlock.replace(/name: .+/, `name: ${newName}`);
			updatedBlock = updatedBlock.replace(`path: ${file.path}`, `path: ${newPath}`);
			updatedBlock = updatedBlock.replace(
				`path includes Issues/${folder}/${oldIssueId}`,
				`path includes Issues/${folder}/${newIssueId}`
			);
			return updatedBlock;
		});

		// Update issue file H1
		let issueContent = await app.vault.read(file);
		issueContent = issueContent.replace(/^(# ).+$/m, `$1${newName}`);
		await app.vault.modify(file, issueContent);

		// Rename file
		await app.vault.rename(file, newPath);

		if (migrateIssueSettings(plugin.settings, dashboard.id, oldIssueId, newIssueId)) {
			void plugin.saveSettings();
		}
		new Notice(`Renamed: ${oldIssueId} → ${newIssueId}`);
	};


	const updateDashboardWithGitHubLink = async (
		dashboard: DashboardConfig,
		issueId: string,
		githubUrl: string
	): Promise<void> => {
		await editDashboardIssueBlock(dashboard, issueId, (block) => {
			let updatedBlock = block;

			updatedBlock = updatedBlock.replace(/^github: (.+)$/m, 'github_link: $1');

			const controlsBlockEnd = updatedBlock.indexOf('```\n');
			if (controlsBlockEnd === -1) {
				return updatedBlock;
			}

			return (
				updatedBlock.slice(0, controlsBlockEnd) +
				`github_link: ${githubUrl}\n` +
				updatedBlock.slice(controlsBlockEnd)
			);
		});
	};

	const addGitHubLink = async (
		dashboard: DashboardConfig,
		issueId: string,
		githubUrl: string,
		metadata?: GitHubIssueMetadata
	): Promise<void> => {
		const { file } = getIssueFileOrThrow(dashboard, issueId);
		let content = await app.vault.read(file);

		// Build stored metadata for frontmatter
		const storedMetadata = toStoredGitHubMetadata(metadata);

		content = updateFrontmatterWithGitHubLink(content, githubUrl, storedMetadata);
		content = updateBodyWithGitHubLink(content, githubUrl, storedMetadata, dashboard.id);

		await app.vault.modify(file, content);
		await updateDashboardWithGitHubLink(dashboard, issueId, githubUrl);

		new Notice(`GitHub link added to ${issueId}`);
	};

	const removeGitHubLink = async (
		dashboard: DashboardConfig,
		issueId: string,
		githubUrl: string
	): Promise<void> => {
		const { file } = getIssueFileOrThrow(dashboard, issueId);
		let content = await app.vault.read(file);
		content = removeGitHubLinkFromIssueContent(content, githubUrl);

		await app.vault.modify(file, content);

		await editDashboardIssueBlock(dashboard, issueId, (block) => {
			return removeGitHubLinkFromDashboardIssueBlock(block, githubUrl);
		});

		new Notice(`GitHub link removed from ${issueId}`);
	};

	return {
		createIssue,
		importNoteAsIssue,
		archiveIssue,
		unarchiveIssue,
		deleteIssue,
		renameIssue,
		addGitHubLink,
		removeGitHubLink
	};
}

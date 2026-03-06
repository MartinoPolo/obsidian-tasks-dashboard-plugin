import { App, Notice, TFile } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, GitHubIssueMetadata, Issue, IssueStatus, Priority } from '../types';
import { getDashboardPath } from '../utils/dashboard-path';
import { createPlatformService } from '../utils/platform';
import { slugify } from '../utils/slugify';
import {
	generateIssueContent,
	removeGitHubLinkFromDashboardIssueBlock,
	removeGitHubLinkFromIssueContent,
	toStoredGitHubMetadata,
	updateBodyWithGitHubLink,
	updateFrontmatterWithGitHubLink
} from './issue-manager-github';
import { migrateIssueSettings, removeIssueSettings } from './issue-manager-settings';
import {
	appendBeforeFrontmatterClose,
	findIssueFilesByPath,
	getDashboardFilename,
	getFrontmatterCloseIndex,
	getIssueFolderName,
	getIssueFolderStorageKey
} from './issue-manager-shared';
import { CreateIssueParams, ImportNoteParams, IssueManagerInstance } from './issue-manager-types';

const EMPTY_BRANCH_NAME = '';
const CURRENT_DIRECTORY_BRANCH = '.';
const PARENT_DIRECTORY_BRANCH = '..';
const LEADING_DASH_PATTERN = /^-+/;
const TRAILING_DASH_PATTERN = /-+$/;
const WORKTREE_FIELD = 'worktree';
const WORKTREE_BRANCH_FIELD = 'worktree_branch';
const WORKTREE_ORIGIN_FOLDER_FIELD = 'worktree_origin_folder';
const WORKTREE_EXPECTED_FOLDER_FIELD = 'worktree_expected_folder';
const WORKTREE_SETUP_STATE_FIELD = 'worktree_setup_state';
const WORKTREE_BASE_REPOSITORY_FIELD = 'worktree_base_repository';
const WORKTREE_SETUP_POLL_INTERVAL_MS = 1000;
const WORKTREE_SETUP_TIMEOUT_MS = 10_000;

function quoteYamlString(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}

function getFrontmatter(content: string): string | undefined {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
	if (frontmatterMatch === null) {
		return undefined;
	}

	return frontmatterMatch[1];
}

function getFrontmatterStringField(content: string, fieldName: string): string | undefined {
	const frontmatter = getFrontmatter(content);
	if (frontmatter === undefined) {
		return undefined;
	}

	const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const fieldRegex = new RegExp(`^${escapedFieldName}:\\s*(.+)\\s*$`, 'm');
	const fieldMatch = frontmatter.match(fieldRegex);
	if (fieldMatch === null) {
		return undefined;
	}

	const rawValue = fieldMatch[1].trim();
	const singleQuotedMatch = rawValue.match(/^'(.*)'$/);
	if (singleQuotedMatch !== null) {
		return singleQuotedMatch[1].replace(/''/g, "'");
	}

	const doubleQuotedMatch = rawValue.match(/^"(.*)"$/);
	if (doubleQuotedMatch !== null) {
		return doubleQuotedMatch[1].replace(/\\"/g, '"');
	}

	return rawValue;
}

function upsertFrontmatterField(content: string, fieldName: string, rawValue: string): string {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
	if (frontmatterMatch === null) {
		return content;
	}

	const frontmatterBody = frontmatterMatch[1];
	const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const fieldPattern = new RegExp(`^${escapedFieldName}:\\s*.*$`, 'm');
	const updatedFrontmatterBody = fieldPattern.test(frontmatterBody)
		? frontmatterBody.replace(fieldPattern, `${fieldName}: ${rawValue}`)
		: `${frontmatterBody}\n${fieldName}: ${rawValue}`;
	const updatedFrontmatter = `---\n${updatedFrontmatterBody}\n---`;

	return updatedFrontmatter + content.slice(frontmatterMatch[0].length);
}

function getExpectedWorktreeFolder(
	worktreeOriginFolder: string | undefined,
	worktreeBranch: string
): string | undefined {
	if (worktreeOriginFolder === undefined || worktreeOriginFolder.trim() === '') {
		return undefined;
	}

	const normalizedOrigin = worktreeOriginFolder.replace(/[\\/]+$/, '');
	const parentFolder = normalizedOrigin.replace(/[\\/][^\\/]+$/, '');
	if (parentFolder === '') {
		return undefined;
	}

	const separator = parentFolder.includes('\\') ? '\\' : '/';
	return `${parentFolder}${separator}worktrees${separator}${worktreeBranch}`;
}

function isValidGitBranchName(branchName: string): boolean {
	if (branchName === EMPTY_BRANCH_NAME) {
		return false;
	}

	if (branchName === CURRENT_DIRECTORY_BRANCH || branchName === PARENT_DIRECTORY_BRANCH) {
		return false;
	}

	if (branchName.startsWith('-')) {
		return false;
	}

	return /^[a-z0-9_][a-z0-9_-]*$/.test(branchName);
}

function sanitizeGitBranchName(preferredName: string, fallbackName: string): string {
	const preferredCandidate = slugify(preferredName)
		.replace(LEADING_DASH_PATTERN, '')
		.replace(TRAILING_DASH_PATTERN, '');
	if (isValidGitBranchName(preferredCandidate)) {
		return preferredCandidate;
	}

	const fallbackCandidate = slugify(fallbackName)
		.replace(LEADING_DASH_PATTERN, '')
		.replace(TRAILING_DASH_PATTERN, '');
	if (isValidGitBranchName(fallbackCandidate)) {
		return fallbackCandidate;
	}

	return 'worktree';
}

export type { CreateIssueParams, ImportNoteParams, IssueManagerInstance };

export function createIssueManager(app: App, plugin: TasksDashboardPlugin): IssueManagerInstance {
	const platformService = createPlatformService();
	const activeOperationLocks = new Set<string>();
	const activeWorktreeSetupLocks = new Set<string>();

	const isMissingIssueOrFileError = (error: unknown): boolean => {
		if (!(error instanceof Error)) {
			return false;
		}

		return /issue not found|no such file|enoent|not found/i.test(error.message);
	};

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

	const isAbsolutePath = (path: string): boolean => {
		return /^[A-Za-z]:[\\/]/.test(path) || path.startsWith('/');
	};

	const doesPathExist = async (path: string): Promise<boolean> => {
		if (isAbsolutePath(path)) {
			return platformService.pathExists(path);
		}
		return app.vault.adapter.exists(path);
	};

	const assignIssueFolderLikeManual = (
		dashboardId: string,
		issueId: string,
		folderPath: string
	): void => {
		const issueFolderKey = getIssueFolderStorageKey(dashboardId, issueId);
		plugin.settings.issueFolders[issueFolderKey] = folderPath;
		void plugin.saveSettings();
		plugin.triggerDashboardRefresh();
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

	const upsertDashboardIssueBlockField = (
		block: string,
		fieldName: string,
		fieldValue: string
	): string => {
		const controlsStart = block.indexOf('```tasks-dashboard-controls');
		if (controlsStart === -1) {
			return block;
		}
		const firstFenceEnd = block.indexOf(
			'```',
			controlsStart + '```tasks-dashboard-controls'.length
		);
		if (firstFenceEnd === -1) {
			return block;
		}

		const controlsSection = block.slice(controlsStart, firstFenceEnd);
		const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const fieldRegex = new RegExp(`^${escapedFieldName}:\\s*.*$`, 'm');
		const updatedControlsSection = fieldRegex.test(controlsSection)
			? controlsSection.replace(fieldRegex, `${fieldName}: ${fieldValue}`)
			: `${controlsSection}${fieldName}: ${fieldValue}\n`;

		return block.slice(0, controlsStart) + updatedControlsSection + block.slice(firstFenceEnd);
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
		const {
			name,
			priority,
			githubLink,
			githubMetadata,
			dashboard,
			worktree,
			worktreeColor,
			worktreeBranch,
			worktreeOriginFolder,
			worktreeExpectedFolder,
			worktreeSetupState,
			worktreeBaseRepository
		} = params;
		const issueId = slugify(name);
		const activePath = getIssuePathByStatus(dashboard, 'active');
		const trimmedName = name.trim();
		const githubNumberPrefix =
			githubMetadata?.number !== undefined ? `#${githubMetadata.number} ` : '';
		const preferredWorktreeName =
			trimmedName !== ''
				? githubNumberPrefix !== '' && trimmedName.startsWith('#')
					? trimmedName
					: `${githubNumberPrefix}${trimmedName}`.trim()
				: `${githubNumberPrefix}${issueId}`.trim();
		const derivedWorktreeBranch =
			worktree === true
				? (worktreeBranch ?? sanitizeGitBranchName(preferredWorktreeName, issueId))
				: undefined;
		const resolvedWorktreeOriginFolder =
			worktree === true ? (worktreeOriginFolder ?? dashboard.projectFolder) : undefined;
		const derivedWorktreeExpectedFolder =
			worktree === true
				? (worktreeExpectedFolder ??
					getExpectedWorktreeFolder(
						resolvedWorktreeOriginFolder,
						derivedWorktreeBranch ?? issueId
					))
				: undefined;
		const derivedWorktreeSetupState =
			worktree === true ? (worktreeSetupState ?? 'pending') : undefined;

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
			worktree,
			worktreeBranch: derivedWorktreeBranch,
			worktreeOriginFolder: resolvedWorktreeOriginFolder,
			worktreeExpectedFolder: derivedWorktreeExpectedFolder,
			worktreeSetupState: derivedWorktreeSetupState,
			worktreeBaseRepository,
			filePath
		};

		let content = generateIssueContent(issue, dashboard);
		if (worktree === true) {
			let worktreeFrontmatter = `\n${WORKTREE_FIELD}: true`;
			if (worktreeColor !== undefined && worktreeColor !== '') {
				worktreeFrontmatter += `\nworktree_color: "${worktreeColor}"`;
			}
			if (derivedWorktreeBranch !== undefined && derivedWorktreeBranch !== '') {
				worktreeFrontmatter += `\n${WORKTREE_BRANCH_FIELD}: ${quoteYamlString(derivedWorktreeBranch)}`;
			}
			if (resolvedWorktreeOriginFolder !== undefined && resolvedWorktreeOriginFolder !== '') {
				worktreeFrontmatter += `\n${WORKTREE_ORIGIN_FOLDER_FIELD}: ${quoteYamlString(resolvedWorktreeOriginFolder)}`;
			}
			if (
				derivedWorktreeExpectedFolder !== undefined &&
				derivedWorktreeExpectedFolder !== ''
			) {
				worktreeFrontmatter += `\n${WORKTREE_EXPECTED_FOLDER_FIELD}: ${quoteYamlString(derivedWorktreeExpectedFolder)}`;
			}
			if (derivedWorktreeSetupState !== undefined) {
				worktreeFrontmatter += `\n${WORKTREE_SETUP_STATE_FIELD}: ${derivedWorktreeSetupState}`;
			}
			if (worktreeBaseRepository !== undefined && worktreeBaseRepository !== '') {
				worktreeFrontmatter += `\n${WORKTREE_BASE_REPOSITORY_FIELD}: ${quoteYamlString(worktreeBaseRepository)}`;
			}
			content = appendBeforeFrontmatterClose(content, worktreeFrontmatter);
		}
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

	const hasAssociatedWorktree = async (
		dashboard: DashboardConfig,
		issueId: string
	): Promise<boolean> => {
		const { file } = getIssueFileOrThrow(dashboard, issueId);
		const content = await app.vault.read(file);
		const frontmatter = getFrontmatter(content);
		if (frontmatter === undefined) {
			return false;
		}

		return new RegExp(`^${WORKTREE_FIELD}:\\s*true\\s*$`, 'm').test(frontmatter);
	};

	interface IssueWorktreeMetadata {
		worktree: boolean;
		worktreeBranch?: string;
		worktreeOriginFolder?: string;
		worktreeExpectedFolder?: string;
		worktreeSetupState?: 'pending' | 'active' | 'failed';
		worktreeBaseRepository?: string;
	}

	const getIssueWorktreeMetadata = async (
		dashboard: DashboardConfig,
		issueId: string
	): Promise<IssueWorktreeMetadata> => {
		const { file } = getIssueFileOrThrow(dashboard, issueId);
		const content = await app.vault.read(file);
		const worktree = getFrontmatterStringField(content, WORKTREE_FIELD) === 'true';
		const setupStateValue = getFrontmatterStringField(content, WORKTREE_SETUP_STATE_FIELD);

		return {
			worktree,
			worktreeBranch: getFrontmatterStringField(content, WORKTREE_BRANCH_FIELD),
			worktreeOriginFolder: getFrontmatterStringField(content, WORKTREE_ORIGIN_FOLDER_FIELD),
			worktreeExpectedFolder: getFrontmatterStringField(
				content,
				WORKTREE_EXPECTED_FOLDER_FIELD
			),
			worktreeSetupState:
				setupStateValue === 'pending' ||
				setupStateValue === 'active' ||
				setupStateValue === 'failed'
					? setupStateValue
					: undefined,
			worktreeBaseRepository: getFrontmatterStringField(
				content,
				WORKTREE_BASE_REPOSITORY_FIELD
			)
		};
	};

	const WORKTREE_STRING_FIELD_MAPPINGS: Array<{
		key: keyof IssueWorktreeMetadata;
		field: string;
		quoted: boolean;
		requireNonEmpty: boolean;
	}> = [
		{
			key: 'worktreeBranch',
			field: WORKTREE_BRANCH_FIELD,
			quoted: true,
			requireNonEmpty: true
		},
		{
			key: 'worktreeOriginFolder',
			field: WORKTREE_ORIGIN_FOLDER_FIELD,
			quoted: true,
			requireNonEmpty: true
		},
		{
			key: 'worktreeExpectedFolder',
			field: WORKTREE_EXPECTED_FOLDER_FIELD,
			quoted: true,
			requireNonEmpty: true
		},
		{
			key: 'worktreeSetupState',
			field: WORKTREE_SETUP_STATE_FIELD,
			quoted: false,
			requireNonEmpty: false
		},
		{
			key: 'worktreeBaseRepository',
			field: WORKTREE_BASE_REPOSITORY_FIELD,
			quoted: true,
			requireNonEmpty: true
		}
	];

	const applyWorktreeFieldUpdates = (
		text: string,
		metadata: Partial<IssueWorktreeMetadata>,
		upsertField: (content: string, field: string, value: string) => string,
		formatQuotedValue: (value: string) => string
	): string => {
		let result = text;
		if (metadata.worktree === true) {
			result = upsertField(result, WORKTREE_FIELD, 'true');
		}
		for (const { key, field, quoted, requireNonEmpty } of WORKTREE_STRING_FIELD_MAPPINGS) {
			const value = metadata[key];
			if (value === undefined) {
				continue;
			}
			if (requireNonEmpty && value === '') {
				continue;
			}
			result = upsertField(
				result,
				field,
				quoted ? formatQuotedValue(String(value)) : String(value)
			);
		}
		return result;
	};

	const updateIssueWorktreeMetadata = async (
		dashboard: DashboardConfig,
		issueId: string,
		metadata: Partial<IssueWorktreeMetadata>
	): Promise<void> => {
		const { file } = getIssueFileOrThrow(dashboard, issueId);
		let content = await app.vault.read(file);

		content = applyWorktreeFieldUpdates(
			content,
			metadata,
			upsertFrontmatterField,
			quoteYamlString
		);

		await app.vault.modify(file, content);

		await editDashboardIssueBlock(dashboard, issueId, (block) => {
			return applyWorktreeFieldUpdates(
				block,
				metadata,
				upsertDashboardIssueBlockField,
				(v) => v
			);
		});
	};

	const removeWorktreeFrontmatterFields = (content: string): string => {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (frontmatterMatch === null) {
			return content;
		}

		const frontmatterFields = frontmatterMatch[1]
			.split('\n')
			.filter(
				(line) =>
					!/^worktree(_color|_origin_folder|_branch|_expected_folder|_setup_state|_base_repository)?:/.test(
						line.trim()
					)
			);
		const updatedFrontmatter = `---\n${frontmatterFields.join('\n')}\n---`;
		return updatedFrontmatter + content.slice(frontmatterMatch[0].length);
	};

	const getWorktreeOriginFolder = async (
		dashboard: DashboardConfig,
		issueId: string
	): Promise<string | undefined> => {
		const { file } = getIssueFileOrThrow(dashboard, issueId);
		const content = await app.vault.read(file);
		return getFrontmatterStringField(content, WORKTREE_ORIGIN_FOLDER_FIELD);
	};

	const clearIssueWorktreeAssociation = async (
		dashboard: DashboardConfig,
		issueId: string
	): Promise<void> => {
		const { file } = getIssueFileOrThrow(dashboard, issueId);
		const content = await app.vault.read(file);
		const updatedContent = removeWorktreeFrontmatterFields(content);
		if (updatedContent !== content) {
			await app.vault.modify(file, updatedContent);
		}
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
			if (issueId in plugin.settings.issueColors) {
				delete plugin.settings.issueColors[issueId];
				void plugin.saveSettings();
			}
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
		await app.fileManager.trashFile(file);

		const settingsChanged = removeIssueSettings(plugin.settings, dashboard.id, issueId);
		if (settingsChanged) {
			void plugin.saveSettings();
		}

		new Notice(`Deleted: ${issueId}`);
	};

	const updateIssuePriority = async (
		dashboard: DashboardConfig,
		issueId: string,
		priority: Priority
	): Promise<void> => {
		const { file } = getIssueFileOrThrow(dashboard, issueId);
		let content = await app.vault.read(file);
		if (getFrontmatterCloseIndex(content) !== -1) {
			content = content.replace(
				/^priority:\s*(low|medium|high|top)\s*$/m,
				`priority: ${priority}`
			);
			await app.vault.modify(file, content);
		}

		await editDashboardIssueBlock(dashboard, issueId, (block) => {
			return block.replace(
				/^priority:\s*(low|medium|high|top)\s*$/m,
				`priority: ${priority}`
			);
		});

		new Notice(`Updated priority for ${issueId}`);
	};

	const setupWorktree = (
		dashboard: DashboardConfig,
		issueId: string,
		issueName: string,
		color?: string,
		worktreeOriginFolder?: string
	): void => {
		const parsedWorktreeName = issueName.trim() !== '' ? issueName : issueId;
		const worktreeBranch = sanitizeGitBranchName(parsedWorktreeName, issueId);
		runWorktreeSetup(dashboard, issueId, worktreeBranch, color, worktreeOriginFolder);
	};

	const runWorktreeSetup = (
		dashboard: DashboardConfig,
		issueId: string,
		worktreeBranch: string,
		color?: string,
		worktreeOriginFolder?: string
	): void => {
		const worktreeSetupLockKey = getIssueFolderStorageKey(dashboard.id, issueId);
		if (activeWorktreeSetupLocks.has(worktreeSetupLockKey)) {
			new Notice(`Worktree setup already in progress for ${issueId}`);
			return;
		}
		activeWorktreeSetupLocks.add(worktreeSetupLockKey);

		const resolvedWorktreeOriginFolder = worktreeOriginFolder ?? dashboard.projectFolder;
		const expectedWorktreeFolder = getExpectedWorktreeFolder(
			resolvedWorktreeOriginFolder,
			worktreeBranch
		);
		const resolveDetectedWorktreeFolder = (
			fallbackExpectedFolder: string | undefined
		): string | undefined => {
			if (
				resolvedWorktreeOriginFolder !== undefined &&
				resolvedWorktreeOriginFolder.trim() !== ''
			) {
				const detectedByGit = platformService.findWorktreePathForBranch(
					resolvedWorktreeOriginFolder,
					worktreeBranch
				);
				if (detectedByGit !== undefined && detectedByGit !== '') {
					return detectedByGit;
				}
			}

			return fallbackExpectedFolder;
		};
		const markSetupFailedIfIssueExists = async (): Promise<void> => {
			try {
				await updateIssueWorktreeMetadata(dashboard, issueId, {
					worktree: true,
					worktreeSetupState: 'failed'
				});
			} catch (error) {
				if (isMissingIssueOrFileError(error)) {
					return;
				}

				throw error;
			}
		};

		const handlePollingTerminalError = async (error: unknown): Promise<void> => {
			if (isMissingIssueOrFileError(error)) {
				return;
			}

			await markSetupFailedIfIssueExists();
		};

		void (async () => {
			try {
				const initialDetectedFolder = resolveDetectedWorktreeFolder(expectedWorktreeFolder);
				await updateIssueWorktreeMetadata(dashboard, issueId, {
					worktree: true,
					worktreeBranch,
					worktreeOriginFolder: resolvedWorktreeOriginFolder,
					worktreeExpectedFolder: initialDetectedFolder,
					worktreeSetupState: 'pending'
				});

				platformService.runWorktreeSetupScript(
					worktreeBranch,
					color,
					resolvedWorktreeOriginFolder,
					plugin.settings.worktreeBashPath
				);

				const pollIterations = Math.floor(
					WORKTREE_SETUP_TIMEOUT_MS / WORKTREE_SETUP_POLL_INTERVAL_MS
				);
				for (let iteration = 0; iteration < pollIterations; iteration += 1) {
					await new Promise((resolve) => {
						setTimeout(resolve, WORKTREE_SETUP_POLL_INTERVAL_MS);
					});

					const metadata = await getIssueWorktreeMetadata(dashboard, issueId);
					const expectedFolder = metadata.worktreeExpectedFolder;
					const detectedFolder = resolveDetectedWorktreeFolder(expectedFolder);
					if (detectedFolder === undefined || detectedFolder === '') {
						continue;
					}

					const detectedFolderExists = await doesPathExist(detectedFolder);
					if (!detectedFolderExists) {
						continue;
					}

					assignIssueFolderLikeManual(dashboard.id, issueId, detectedFolder);
					const issueFolderKey = getIssueFolderStorageKey(dashboard.id, issueId);
					const isFolderAssigned =
						plugin.settings.issueFolders[issueFolderKey] === detectedFolder;
					if (!isFolderAssigned) {
						continue;
					}

					await updateIssueWorktreeMetadata(dashboard, issueId, {
						worktree: true,
						worktreeExpectedFolder: detectedFolder,
						worktreeSetupState: 'active'
					});
					platformService.openTerminal(detectedFolder, color);
					return;
				}

				await markSetupFailedIfIssueExists();
			} catch (error) {
				await handlePollingTerminalError(error);
			} finally {
				activeWorktreeSetupLocks.delete(worktreeSetupLockKey);
			}
		})();
	};

	const retryWorktreeSetup = async (
		dashboard: DashboardConfig,
		issueId: string,
		branchOverride?: string
	): Promise<void> => {
		const metadata = await getIssueWorktreeMetadata(dashboard, issueId);
		const worktreeBranch =
			branchOverride !== undefined && branchOverride !== ''
				? branchOverride
				: metadata.worktreeBranch !== undefined && metadata.worktreeBranch !== ''
					? metadata.worktreeBranch
					: sanitizeGitBranchName(issueId, issueId);
		const issueColor = plugin.settings.issueColors[issueId];
		runWorktreeSetup(
			dashboard,
			issueId,
			worktreeBranch,
			issueColor,
			metadata.worktreeOriginFolder
		);
	};

	const refreshWorktreeState = async (
		dashboard: DashboardConfig,
		issueId: string
	): Promise<void> => {
		const metadata = await getIssueWorktreeMetadata(dashboard, issueId);
		if (!metadata.worktree) {
			return;
		}

		const expectedFolder = metadata.worktreeExpectedFolder;
		const originFolder = metadata.worktreeOriginFolder;
		const branch = metadata.worktreeBranch;

		if (expectedFolder !== undefined && expectedFolder !== '') {
			const folderExists = platformService.pathExists(expectedFolder);
			if (folderExists) {
				if (metadata.worktreeSetupState !== 'active') {
					await updateIssueWorktreeMetadata(dashboard, issueId, {
						worktree: true,
						worktreeSetupState: 'active'
					});
				}
				new Notice(`Worktree is active: ${issueId}`);
				plugin.triggerDashboardRefresh();
				return;
			}
		}

		if (
			branch !== undefined &&
			branch !== '' &&
			originFolder !== undefined &&
			originFolder !== ''
		) {
			const branchMissing = platformService.isGitBranchMissing(originFolder, branch);
			if (branchMissing) {
				await updateIssueWorktreeMetadata(dashboard, issueId, {
					worktree: true,
					worktreeSetupState: 'failed'
				});
				new Notice(`Worktree branch missing: ${branch}`);
				plugin.triggerDashboardRefresh();
				return;
			}

			const detectedFolder = platformService.findWorktreePathForBranch(originFolder, branch);
			if (detectedFolder !== undefined && detectedFolder !== '') {
				const detectedFolderExists = platformService.pathExists(detectedFolder);
				if (detectedFolderExists) {
					await updateIssueWorktreeMetadata(dashboard, issueId, {
						worktree: true,
						worktreeExpectedFolder: detectedFolder,
						worktreeSetupState: 'active'
					});
					assignIssueFolderLikeManual(dashboard.id, issueId, detectedFolder);
					new Notice(`Worktree is active: ${issueId}`);
					plugin.triggerDashboardRefresh();
					return;
				}
			}
		}

		if (metadata.worktreeSetupState !== 'failed') {
			await updateIssueWorktreeMetadata(dashboard, issueId, {
				worktree: true,
				worktreeSetupState: 'failed'
			});
			new Notice(`Worktree folder not found: ${issueId}`);
		} else {
			new Notice(`Worktree state unchanged: ${issueId}`);
		}
		plugin.triggerDashboardRefresh();
	};

	const removeWorktree = (
		dashboard: DashboardConfig,
		issueId: string,
		options?: { skipScriptConfirmation?: boolean }
	): void => {
		void (async () => {
			const issueColor = plugin.settings.issueColors[issueId];
			const issueFolderKey = getIssueFolderStorageKey(dashboard.id, issueId);
			const hasFallbackIssueFolder = Boolean(
				Object.prototype.hasOwnProperty.call(plugin.settings.issueFolders, issueFolderKey)
			);
			const fallbackIssueFolder = hasFallbackIssueFolder
				? plugin.settings.issueFolders[issueFolderKey]
				: undefined;
			const worktreeOriginFolder = await getWorktreeOriginFolder(dashboard, issueId);
			const removalWorkingDirectory =
				worktreeOriginFolder ?? fallbackIssueFolder ?? dashboard.projectFolder;

			const launchSucceeded = platformService.runWorktreeRemovalScript(
				issueId,
				removalWorkingDirectory,
				plugin.settings.worktreeBashPath,
				{
					skipConfirmation: options?.skipScriptConfirmation === true,
					tabColor: issueColor
				}
			);
			if (!launchSucceeded) {
				new Notice(
					'Could not launch remove-worktree script. Worktree association was not cleared.'
				);
				return;
			}

			void clearIssueWorktreeAssociation(dashboard, issueId);
		})();
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
		hasAssociatedWorktree,
		archiveIssue,
		unarchiveIssue,
		deleteIssue,
		updateIssuePriority,
		renameIssue,
		setupWorktree,
		retryWorktreeSetup,
		removeWorktree,
		addGitHubLink,
		removeGitHubLink,
		refreshWorktreeState
	};
}

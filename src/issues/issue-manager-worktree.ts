import { App, Notice, TFile } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, IssueStatus } from '../types';
import { PlatformService } from '../utils/platform';
import {
	getFrontmatter,
	getFrontmatterStringField,
	quoteYamlString,
	upsertFrontmatterField
} from './issue-manager-frontmatter';
import { getIssueFolderStorageKey } from './issue-manager-shared';
import { RemoveWorktreeOptions } from './issue-manager-types';
import {
	getExpectedWorktreeFolder,
	sanitizeGitBranchName,
	WORKTREE_BASE_BRANCH_FIELD,
	WORKTREE_BASE_REPOSITORY_FIELD,
	WORKTREE_BRANCH_FIELD,
	WORKTREE_EXPECTED_FOLDER_FIELD,
	WORKTREE_FIELD,
	WORKTREE_ORIGIN_FOLDER_FIELD,
	WORKTREE_SETUP_POLL_INTERVAL_MS,
	WORKTREE_SETUP_STATE_FIELD,
	WORKTREE_SETUP_TIMEOUT_MS
} from './issue-manager-worktree-constants';

export interface IssueWorktreeMetadata {
	worktree: boolean;
	worktreeBranch?: string;
	worktreeOriginFolder?: string;
	worktreeExpectedFolder?: string;
	worktreeSetupState?: 'pending' | 'active' | 'failed';
	worktreeBaseRepository?: string;
	worktreeBaseBranch?: string;
}

export interface WorktreeOperationsDeps {
	app: App;
	plugin: TasksDashboardPlugin;
	platformService: PlatformService;
	activeWorktreeSetupLocks: Set<string>;
	getIssueFileOrThrow: (
		dashboard: DashboardConfig,
		issueId: string
	) => { file: TFile; status: IssueStatus };
	editDashboardIssueBlock: (
		dashboard: DashboardConfig,
		issueId: string,
		transformBlock: (block: string) => string
	) => Promise<void>;
	upsertDashboardIssueBlockField: (
		block: string,
		fieldName: string,
		fieldValue: string
	) => string;
	assignIssueFolderLikeManual: (dashboardId: string, issueId: string, folderPath: string) => void;
	doesPathExist: (path: string) => Promise<boolean>;
	isMissingIssueOrFileError: (error: unknown) => boolean;
}

export interface WorktreeOperations {
	hasAssociatedWorktree: (dashboard: DashboardConfig, issueId: string) => Promise<boolean>;
	getIssueWorktreeMetadata: (
		dashboard: DashboardConfig,
		issueId: string
	) => Promise<IssueWorktreeMetadata>;
	updateIssueWorktreeMetadata: (
		dashboard: DashboardConfig,
		issueId: string,
		metadata: Partial<IssueWorktreeMetadata>
	) => Promise<void>;
	removeWorktreeFrontmatterFields: (content: string) => string;
	getWorktreeOriginFolder: (
		dashboard: DashboardConfig,
		issueId: string
	) => Promise<string | undefined>;
	clearIssueWorktreeAssociation: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	setupWorktree: (
		dashboard: DashboardConfig,
		issueId: string,
		issueName: string,
		color?: string,
		worktreeOriginFolder?: string,
		scriptWorkingDirectory?: string
	) => void;
	retryWorktreeSetup: (
		dashboard: DashboardConfig,
		issueId: string,
		branchOverride?: string
	) => Promise<void>;
	assignExistingWorktree: (
		dashboard: DashboardConfig,
		issueId: string,
		worktreePath: string,
		worktreeBranch: string | undefined,
		worktreeOriginFolder: string
	) => Promise<void>;
	refreshWorktreeState: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	removeWorktree: (
		dashboard: DashboardConfig,
		issueId: string,
		options?: RemoveWorktreeOptions
	) => void;
}

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
	},
	{
		key: 'worktreeBaseBranch',
		field: WORKTREE_BASE_BRANCH_FIELD,
		quoted: true,
		requireNonEmpty: true
	}
];

function applyWorktreeFieldUpdates(
	text: string,
	metadata: Partial<IssueWorktreeMetadata>,
	upsertField: (content: string, field: string, value: string) => string,
	formatQuotedValue: (value: string) => string
): string {
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
}

export function createWorktreeOperations(deps: WorktreeOperationsDeps): WorktreeOperations {
	const {
		app,
		plugin,
		platformService,
		activeWorktreeSetupLocks,
		getIssueFileOrThrow,
		editDashboardIssueBlock,
		upsertDashboardIssueBlockField,
		assignIssueFolderLikeManual,
		doesPathExist,
		isMissingIssueOrFileError
	} = deps;

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
			),
			worktreeBaseBranch: getFrontmatterStringField(content, WORKTREE_BASE_BRANCH_FIELD)
		};
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
					!/^worktree(_color|_origin_folder|_branch|_expected_folder|_setup_state|_base_repository|_base_branch)?:/.test(
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

	const runWorktreeSetup = (
		dashboard: DashboardConfig,
		issueId: string,
		worktreeBranch: string,
		color?: string,
		worktreeOriginFolder?: string,
		scriptWorkingDirectory?: string
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
				const scriptDirectory = scriptWorkingDirectory ?? resolvedWorktreeOriginFolder;
				const capturedBaseBranch =
					scriptDirectory !== undefined
						? platformService.getCurrentBranch(scriptDirectory)
						: undefined;
				await updateIssueWorktreeMetadata(dashboard, issueId, {
					worktree: true,
					worktreeBranch,
					worktreeOriginFolder: resolvedWorktreeOriginFolder,
					worktreeExpectedFolder: initialDetectedFolder,
					worktreeSetupState: 'pending',
					worktreeBaseBranch: capturedBaseBranch
				});

				platformService.runWorktreeSetupScript(
					worktreeBranch,
					color,
					scriptDirectory ?? resolvedWorktreeOriginFolder,
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

	const setupWorktree = (
		dashboard: DashboardConfig,
		issueId: string,
		issueName: string,
		color?: string,
		worktreeOriginFolder?: string,
		scriptWorkingDirectory?: string
	): void => {
		const parsedWorktreeName = issueName.trim() !== '' ? issueName : issueId;
		const worktreeBranch = sanitizeGitBranchName(parsedWorktreeName, issueId);
		runWorktreeSetup(
			dashboard,
			issueId,
			worktreeBranch,
			color,
			worktreeOriginFolder,
			scriptWorkingDirectory
		);
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

	const assignExistingWorktree = async (
		dashboard: DashboardConfig,
		issueId: string,
		worktreePath: string,
		worktreeBranch: string | undefined,
		worktreeOriginFolder: string
	): Promise<void> => {
		const capturedBaseBranch = platformService.getCurrentBranch(worktreeOriginFolder);
		await updateIssueWorktreeMetadata(dashboard, issueId, {
			worktree: true,
			worktreeBranch,
			worktreeOriginFolder,
			worktreeExpectedFolder: worktreePath,
			worktreeSetupState: 'active',
			worktreeBaseRepository: worktreeOriginFolder,
			worktreeBaseBranch: capturedBaseBranch
		});
		assignIssueFolderLikeManual(dashboard.id, issueId, worktreePath);
		new Notice(`Worktree assigned: ${issueId}`);
	};

	const refreshWorktreeState = async (
		dashboard: DashboardConfig,
		issueId: string,
		options?: { silent?: boolean }
	): Promise<void> => {
		const silent = options?.silent === true;
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
				if (!silent) {
					new Notice(`Worktree branch missing: ${branch}`);
				}
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
			if (!silent) {
				new Notice(`Worktree folder not found: ${issueId}`);
			}
		}
		plugin.triggerDashboardRefresh();
	};

	const removeWorktree = (
		dashboard: DashboardConfig,
		issueId: string,
		options?: RemoveWorktreeOptions
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

	return {
		hasAssociatedWorktree,
		getIssueWorktreeMetadata,
		updateIssueWorktreeMetadata,
		removeWorktreeFrontmatterFields,
		getWorktreeOriginFolder,
		clearIssueWorktreeAssociation,
		setupWorktree,
		retryWorktreeSetup,
		assignExistingWorktree,
		refreshWorktreeState,
		removeWorktree
	};
}

import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import type { DashboardConfig } from '../types';
import type { PlatformService } from '../utils/platform';
import type { GitStatusServiceInstance } from '../git-status/git-status-service';
import { SYNC_COMMAND, SYNC_COMMAND_ARGS } from '../constants/sync-constants';
import { parseParams } from './dashboard-renderer-params';
import { CONTROLS_BLOCK_PATTERN, readDashboardContent } from './dashboard-content-reader';
import { resolveRepoRoot, createFetchCoordinator } from '../git-status/git-fetch-coordinator';
import { isWorktreeDirty, detectMergeConflicts } from '../git-status/git-local-detection';
import { mergeAndPush } from '../git-status/sync-merge-push';
import { SyncAllProgressModal } from '../modals/sync-all-progress-modal';

interface UnsyncedBranchInfo {
	worktreeFolder: string;
	branchName: string;
	baseBranch: string;
	issueId: string;
	dashboardId: string;
}

export interface SyncAllDependencies {
	app: App;
	dashboard: DashboardConfig;
	dashboardId: string;
	platformService: PlatformService;
	gitStatusService: GitStatusServiceInstance;
}

export async function getUnsyncedBranches(
	dependencies: SyncAllDependencies
): Promise<UnsyncedBranchInfo[]> {
	const { app, dashboard, dashboardId, gitStatusService } = dependencies;
	const dashboardData = await readDashboardContent(app, dashboard);
	if (dashboardData === undefined) {
		return [];
	}
	const { content, parsed } = dashboardData;
	const unsyncedBranches: UnsyncedBranchInfo[] = [];

	for (const issue of parsed.activeIssues) {
		const issueContent = content.substring(issue.startIndex, issue.endIndex);
		for (const match of issueContent.matchAll(CONTROLS_BLOCK_PATTERN)) {
			const controlBlockContent = match[1];
			const controlParams = parseParams(controlBlockContent);
			if (controlParams === null) {
				continue;
			}
			const worktreeFolder = controlParams.worktree_expected_folder;
			const branchName = controlParams.worktree_branch;
			const baseBranch = controlParams.worktree_base_branch;
			if (worktreeFolder === undefined || worktreeFolder === '') {
				continue;
			}
			if (branchName === undefined || branchName === '') {
				continue;
			}
			if (baseBranch === undefined || baseBranch === '') {
				continue;
			}
			const cachedStatus = gitStatusService.getCachedStatus(dashboardId, issue.id);
			if (cachedStatus === undefined) {
				continue;
			}
			const behindCount = cachedStatus.behindBaseCount;
			if (behindCount === undefined || behindCount <= 0) {
				continue;
			}
			unsyncedBranches.push({
				worktreeFolder,
				branchName,
				baseBranch,
				issueId: issue.id,
				dashboardId
			});
		}
	}

	return unsyncedBranches;
}

async function syncOneBranch(
	branch: UnsyncedBranchInfo,
	progressModal: SyncAllProgressModal,
	gitStatusService: GitStatusServiceInstance
): Promise<void> {
	// Check dirty
	progressModal.updateBranch(branch.branchName, 'checking');
	const dirty = isWorktreeDirty(branch.worktreeFolder);
	if (dirty === true) {
		progressModal.updateBranch(branch.branchName, 'dirty');
		return;
	}

	// Check conflicts via merge-tree
	try {
		const hasConflicts = await detectMergeConflicts(branch.worktreeFolder, branch.baseBranch);
		if (hasConflicts === true) {
			progressModal.updateBranch(branch.branchName, 'conflicts');
			return;
		}
	} catch {
		progressModal.updateBranch(branch.branchName, 'failed', 'Conflict check failed');
		return;
	}

	// Merge + Push
	progressModal.updateBranch(branch.branchName, 'merging');
	const result = await mergeAndPush(branch.worktreeFolder, branch.baseBranch);

	if (result.outcome === 'merge-failed') {
		progressModal.updateBranch(branch.branchName, 'failed', result.errorMessage);
		return;
	}

	progressModal.updateBranch(branch.branchName, 'pushing');
	if (result.outcome === 'push-failed') {
		progressModal.updateBranch(branch.branchName, 'failed', result.errorMessage);
		return;
	}

	// Success
	progressModal.updateBranch(branch.branchName, 'done');
	gitStatusService.invalidate(branch.dashboardId, branch.issueId);
}

export async function handleSyncAllBranches(dependencies: SyncAllDependencies): Promise<void> {
	try {
		const { app, platformService, gitStatusService } = dependencies;
		const unsyncedBranches = await getUnsyncedBranches(dependencies);
		if (unsyncedBranches.length === 0) {
			new Notice('No branches need syncing.');
			return;
		}

		// Open progress modal
		const branchNames = unsyncedBranches.map((branch) => branch.branchName);
		const progressModal = new SyncAllProgressModal(app, branchNames);
		progressModal.setClaudeHandleCallback((branchName) => {
			const branch = unsyncedBranches.find((b) => b.branchName === branchName);
			if (branch !== undefined) {
				platformService.openTerminalWithCommand(branch.worktreeFolder, SYNC_COMMAND, [
					...SYNC_COMMAND_ARGS
				]);
			}
		});
		progressModal.open();

		// Deduplicate repo roots and group branches by repo
		const fetchCoordinator = createFetchCoordinator();
		const branchesByRepoRoot = new Map<string, UnsyncedBranchInfo[]>();
		for (const branch of unsyncedBranches) {
			const repoRoot = resolveRepoRoot(branch.worktreeFolder) ?? branch.worktreeFolder;
			const existing = branchesByRepoRoot.get(repoRoot);
			if (existing !== undefined) {
				existing.push(branch);
			} else {
				branchesByRepoRoot.set(repoRoot, [branch]);
			}
		}

		// Mark all branches as fetching, then fetch all repos in parallel
		for (const branch of unsyncedBranches) {
			progressModal.updateBranch(branch.branchName, 'fetching');
		}
		await Promise.all(
			[...branchesByRepoRoot.keys()].map((root) =>
				fetchCoordinator.fetchOnce(root).catch(() => {
					// Fetch failed for this repo — continue with stale refs
				})
			)
		);

		// Sync branches — parallel across repos, sequential within same repo to avoid lock contention
		const repoGroupPromises = [...branchesByRepoRoot.values()].map(async (repoBranches) => {
			for (const branch of repoBranches) {
				await syncOneBranch(branch, progressModal, gitStatusService);
			}
		});

		await Promise.all(repoGroupPromises);
		progressModal.markComplete();
	} catch {
		new Notice('Failed to sync branches.');
	}
}

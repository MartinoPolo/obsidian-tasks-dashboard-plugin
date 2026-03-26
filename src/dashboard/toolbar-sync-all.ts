import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import type { DashboardConfig } from '../types';
import type { PlatformService } from '../utils/platform';
import type { GitStatusServiceInstance } from '../git-status/git-status-service';
import { runGitCommandAsync } from '../utils/platform/process-spawn';
import { SYNC_COMMAND, SYNC_COMMAND_ARGS } from '../constants/sync-constants';
import { parseParams } from './dashboard-renderer-params';
import { CONTROLS_BLOCK_PATTERN, readDashboardContent } from './dashboard-content-reader';
import { resolveRepoRoot, createFetchCoordinator } from '../git-status/git-fetch-coordinator';
import { isWorktreeDirty, detectMergeConflicts } from '../git-status/git-local-detection';
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

		// Deduplicate repo roots and fetch once per repo
		const fetchCoordinator = createFetchCoordinator();
		const repoRoots = new Set<string>();
		for (const branch of unsyncedBranches) {
			const repoRoot = resolveRepoRoot(branch.worktreeFolder);
			if (repoRoot !== undefined) {
				repoRoots.add(repoRoot);
			}
		}

		// Mark all branches as fetching, then fetch all repos in parallel
		for (const branch of unsyncedBranches) {
			progressModal.updateBranch(branch.branchName, 'fetching');
		}
		await Promise.all([...repoRoots].map((root) => fetchCoordinator.fetchOnce(root)));

		// Sync each branch in parallel
		const syncPromises = unsyncedBranches.map(async (branch) => {
			// Check dirty
			progressModal.updateBranch(branch.branchName, 'checking');
			const dirty = isWorktreeDirty(branch.worktreeFolder);
			if (dirty === true) {
				progressModal.updateBranch(branch.branchName, 'dirty');
				return;
			}

			// Check conflicts via merge-tree
			try {
				const hasConflicts = await detectMergeConflicts(
					branch.worktreeFolder,
					branch.baseBranch
				);
				if (hasConflicts === true) {
					progressModal.updateBranch(branch.branchName, 'conflicts');
					return;
				}
			} catch {
				progressModal.updateBranch(branch.branchName, 'failed', 'Conflict check failed');
				return;
			}

			// Merge
			progressModal.updateBranch(branch.branchName, 'merging');
			try {
				const mergeResult = await runGitCommandAsync(branch.worktreeFolder, [
					'merge',
					`origin/${branch.baseBranch}`,
					'--no-edit'
				]);
				if (mergeResult.status !== 0) {
					progressModal.updateBranch(
						branch.branchName,
						'failed',
						mergeResult.stderr.trim() || 'Merge failed'
					);
					return;
				}
			} catch {
				progressModal.updateBranch(branch.branchName, 'failed', 'Merge command failed');
				return;
			}

			// Push
			progressModal.updateBranch(branch.branchName, 'pushing');
			try {
				const pushResult = await runGitCommandAsync(branch.worktreeFolder, ['push']);
				if (pushResult.status !== 0) {
					progressModal.updateBranch(
						branch.branchName,
						'failed',
						pushResult.stderr.trim() || 'Push failed'
					);
					return;
				}
			} catch {
				progressModal.updateBranch(branch.branchName, 'failed', 'Push command failed');
				return;
			}

			// Success
			progressModal.updateBranch(branch.branchName, 'done');
			gitStatusService.invalidate(branch.dashboardId, branch.issueId);
		});

		await Promise.all(syncPromises);
		progressModal.markComplete();
	} catch {
		new Notice('Failed to sync branches.');
	}
}

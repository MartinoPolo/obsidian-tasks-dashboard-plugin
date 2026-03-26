import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import { runGitCommandAsync } from '../utils/platform/process-spawn';
import { detectMergeConflicts, isWorktreeDirty } from './git-local-detection';
import { SyncProgressModal } from '../modals/sync-progress-modal';
import { DirtyWorktreeModal } from '../modals/dirty-worktree-modal';
import type { PlatformService } from '../utils/platform';
import { SYNC_COMMAND, SYNC_COMMAND_ARGS } from '../constants/sync-constants';

export interface SyncSingleBranchParams {
	app: App;
	worktreeFolder: string;
	baseBranch: string;
	branchName: string;
	platformService: PlatformService;
	onSuccess: () => void;
}

export async function syncSingleBranch(params: SyncSingleBranchParams): Promise<void> {
	const { app, worktreeFolder, baseBranch, branchName, platformService, onSuccess } = params;

	// Step 1: Check if worktree is dirty
	const dirty = isWorktreeDirty(worktreeFolder);
	if (dirty === true) {
		new DirtyWorktreeModal(app, branchName, (choice) => {
			if (choice === 'let-claude-handle') {
				platformService.openTerminalWithCommand(worktreeFolder, SYNC_COMMAND, [
					...SYNC_COMMAND_ARGS
				]);
			}
		}).open();
		return;
	}

	// Step 2: Open progress modal
	const progressModal = new SyncProgressModal(app, baseBranch);
	progressModal.open();

	// Step 3: Check for conflicts
	progressModal.updateStep(0, 'active');
	try {
		const hasConflicts = await detectMergeConflicts(worktreeFolder, baseBranch);
		if (hasConflicts === true) {
			progressModal.updateStep(0, 'failed', 'Merge conflicts detected — opening Claude Code');
			progressModal.close();
			platformService.openTerminalWithCommand(worktreeFolder, SYNC_COMMAND, [
				...SYNC_COMMAND_ARGS
			]);
			return;
		}
		progressModal.updateStep(0, 'complete');
	} catch {
		progressModal.updateStep(0, 'failed', 'Failed to check for conflicts');
		return;
	}

	// Step 4: Merge
	progressModal.updateStep(1, 'active');
	try {
		const mergeResult = await runGitCommandAsync(worktreeFolder, [
			'merge',
			`origin/${baseBranch}`,
			'--no-edit'
		]);
		if (mergeResult.status !== 0) {
			const errorMessage = mergeResult.stderr.trim() || 'Merge failed';
			progressModal.updateStep(1, 'failed', errorMessage);
			return;
		}
		progressModal.updateStep(1, 'complete');
	} catch {
		progressModal.updateStep(1, 'failed', 'Merge command failed');
		return;
	}

	// Step 5: Push
	progressModal.updateStep(2, 'active');
	try {
		const pushResult = await runGitCommandAsync(worktreeFolder, ['push']);
		if (pushResult.status !== 0) {
			const errorMessage = pushResult.stderr.trim() || 'Push failed';
			progressModal.updateStep(2, 'failed', errorMessage);
			return;
		}
		progressModal.updateStep(2, 'complete');
	} catch {
		progressModal.updateStep(2, 'failed', 'Push command failed');
		return;
	}

	// Step 6: Success
	new Notice('Branch synced successfully');
	progressModal.close();
	onSuccess();
}

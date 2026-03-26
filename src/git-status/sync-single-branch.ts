import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import { detectMergeConflicts, isWorktreeDirty } from './git-local-detection';
import { mergeAndPush } from './sync-merge-push';
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
	onFinally: () => void;
}

export async function syncSingleBranch(params: SyncSingleBranchParams): Promise<void> {
	const { app, worktreeFolder, baseBranch, branchName, platformService, onSuccess, onFinally } =
		params;

	// Step 1: Check if worktree is dirty
	const dirty = isWorktreeDirty(worktreeFolder);
	if (dirty === true) {
		onFinally();
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

	try {
		// Step 3: Check for conflicts
		progressModal.updateStep(0, 'active');
		try {
			const hasConflicts = await detectMergeConflicts(worktreeFolder, baseBranch);
			if (hasConflicts === true) {
				progressModal.updateStep(
					0,
					'failed',
					'Merge conflicts detected — opening Claude Code'
				);
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

		// Step 4: Merge + Push (auto-creates upstream if needed)
		progressModal.updateStep(1, 'active');
		const result = await mergeAndPush(worktreeFolder, baseBranch, branchName);

		if (result.outcome === 'merge-failed') {
			progressModal.updateStep(1, 'failed', result.errorMessage);
			return;
		}
		progressModal.updateStep(1, 'complete');

		if (result.outcome === 'push-failed') {
			progressModal.updateStep(2, 'failed', result.errorMessage);
			return;
		}
		progressModal.updateStep(2, 'complete');

		// Step 5: Success
		new Notice('Branch synced successfully');
		progressModal.close();
		onSuccess();
	} finally {
		onFinally();
	}
}

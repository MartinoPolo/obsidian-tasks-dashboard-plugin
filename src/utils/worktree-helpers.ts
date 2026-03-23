import type { WorktreeSetupState } from '../types';
import { extractLastPathSegment } from './path-utils';
import { createPlatformService } from './platform';

const platformService = createPlatformService();
const defaultBranchCache = new Map<string, string | undefined>();

export function getCachedDefaultBranch(originFolder: string): string | undefined {
	if (defaultBranchCache.has(originFolder)) {
		return defaultBranchCache.get(originFolder);
	}
	const result = platformService.getDefaultBranch(originFolder);
	defaultBranchCache.set(originFolder, result);
	return result;
}

export function buildWorktreeLocationTooltip(
	originFolder: string | undefined,
	checkedOutBranch: string | undefined,
	storedBaseBranch?: string
): string {
	if (originFolder === undefined || originFolder.trim() === '') {
		return 'Worktree active';
	}
	const baseFolderName = extractLastPathSegment(originFolder);
	const baseBranch = storedBaseBranch ?? getCachedDefaultBranch(originFolder);
	const branchDisplay = checkedOutBranch ?? 'unknown';
	if (baseBranch !== undefined) {
		return `${baseFolderName}/${baseBranch} \u2192 ${branchDisplay}`;
	}
	return `${baseFolderName} \u2192 ${branchDisplay}`;
}

export interface WorktreeDisplayState {
	stateClass: 'pending' | 'failed' | 'inactive' | 'active';
	statusText: string;
	isClickable: boolean;
	isActive: boolean;
}

export function deriveWorktreeDisplayState(
	isWorktreeIssue: boolean,
	worktreeSetupState: WorktreeSetupState | undefined,
	isSafeToDelete: boolean
): WorktreeDisplayState {
	const isPending = worktreeSetupState === 'pending';
	const isFailed = worktreeSetupState === 'failed';

	const stateClass = isPending
		? 'pending'
		: isFailed
			? 'failed'
			: isSafeToDelete
				? 'inactive'
				: 'active';

	const statusText = isPending
		? 'Pending worktree setup verification'
		: isFailed
			? 'Worktree setup failed \u2014 retry available'
			: isSafeToDelete
				? 'Worktree safe to delete (merged/closed PR or deleted branch)'
				: 'Worktree active';

	const isClickable = isWorktreeIssue && (isFailed || worktreeSetupState === undefined);
	const isActive = isWorktreeIssue && stateClass === 'active';

	return { stateClass, statusText, isClickable, isActive };
}

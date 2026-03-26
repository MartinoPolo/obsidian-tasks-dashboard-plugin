import { runGitCommandAsync } from '../utils/platform/process-spawn';
import { hasBranchUpstreamConfig } from '../utils/platform/git-operations';

export type MergeAndPushResult =
	| { outcome: 'success' }
	| { outcome: 'no-upstream' }
	| { outcome: 'merge-failed'; errorMessage: string }
	| { outcome: 'push-failed'; errorMessage: string };

export async function mergeAndPush(
	worktreeFolder: string,
	baseBranch: string,
	branchName: string
): Promise<MergeAndPushResult> {
	if (baseBranch.startsWith('-')) {
		return { outcome: 'merge-failed', errorMessage: 'Invalid branch name' };
	}

	try {
		const mergeResult = await runGitCommandAsync(worktreeFolder, [
			'merge',
			`origin/${baseBranch}`,
			'--no-edit'
		]);
		if (mergeResult.status !== 0) {
			return {
				outcome: 'merge-failed',
				errorMessage: mergeResult.stderr.trim() || 'Merge failed'
			};
		}
	} catch {
		return { outcome: 'merge-failed', errorMessage: 'Merge command failed' };
	}

	const hasUpstream = hasBranchUpstreamConfig(worktreeFolder, branchName);
	if (!hasUpstream) {
		return { outcome: 'no-upstream' };
	}

	try {
		const pushResult = await runGitCommandAsync(worktreeFolder, ['push']);
		if (pushResult.status !== 0) {
			return {
				outcome: 'push-failed',
				errorMessage: pushResult.stderr.trim() || 'Push failed'
			};
		}
	} catch {
		return { outcome: 'push-failed', errorMessage: 'Push command failed' };
	}

	return { outcome: 'success' };
}

export type PushResult =
	| { outcome: 'success' }
	| { outcome: 'no-upstream' }
	| { outcome: 'push-failed'; errorMessage: string };

export async function pushBranch(
	worktreeFolder: string,
	branchName: string,
	setUpstream: boolean
): Promise<PushResult> {
	if (branchName.startsWith('-')) {
		return { outcome: 'push-failed', errorMessage: 'Invalid branch name' };
	}

	if (!setUpstream) {
		const hasUpstream = hasBranchUpstreamConfig(worktreeFolder, branchName);
		if (!hasUpstream) {
			return { outcome: 'no-upstream' };
		}
	}

	try {
		const args = setUpstream ? ['push', '-u', 'origin', branchName] : ['push'];
		const pushResult = await runGitCommandAsync(worktreeFolder, args);
		if (pushResult.status !== 0) {
			return {
				outcome: 'push-failed',
				errorMessage: pushResult.stderr.trim() || 'Push failed'
			};
		}
	} catch {
		return { outcome: 'push-failed', errorMessage: 'Push command failed' };
	}

	return { outcome: 'success' };
}

import { runGitCommandAsync } from '../utils/platform/process-spawn';

export type MergeAndPushResult =
	| { outcome: 'success' }
	| { outcome: 'merge-failed'; errorMessage: string }
	| { outcome: 'push-failed'; errorMessage: string };

export async function mergeAndPush(
	worktreeFolder: string,
	baseBranch: string
): Promise<MergeAndPushResult> {
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

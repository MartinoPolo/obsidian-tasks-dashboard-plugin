import { runGitCommandAsync, runGitCommandOutput } from '../utils/platform/process-spawn';

function isUnsafeBranchRef(ref: string): boolean {
	return ref.startsWith('-');
}

export function getBehindCount(worktreeFolder: string, baseBranch: string): number | undefined {
	if (isUnsafeBranchRef(baseBranch)) {
		return undefined;
	}
	const output = runGitCommandOutput(worktreeFolder, [
		'rev-list',
		'--count',
		`HEAD..origin/${baseBranch}`
	]);
	if (output === undefined) {
		return undefined;
	}
	const count = parseInt(output.trim(), 10);
	if (Number.isNaN(count)) {
		return undefined;
	}
	return count;
}

export function isWorktreeDirty(worktreeFolder: string): boolean | undefined {
	const output = runGitCommandOutput(worktreeFolder, ['status', '--porcelain']);
	if (output === undefined) {
		return undefined;
	}
	return output.trim() !== '';
}

export async function detectMergeConflicts(
	worktreeFolder: string,
	baseBranch: string
): Promise<boolean | undefined> {
	if (isUnsafeBranchRef(baseBranch)) {
		return undefined;
	}
	try {
		const result = await runGitCommandAsync(worktreeFolder, [
			'merge-tree',
			'--write-tree',
			'HEAD',
			`origin/${baseBranch}`
		]);
		// Exit code 0 = no conflicts, exit code 1 = conflicts
		if (result.status === 0) {
			return false;
		}
		if (result.status === 1) {
			return true;
		}
		// Other exit codes = error
		return undefined;
	} catch {
		return undefined;
	}
}

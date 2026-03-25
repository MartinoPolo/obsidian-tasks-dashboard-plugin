import type { WorktreeEntry } from './platform-types';
import { getRequiredFunction, loadModule } from './node-interop';
import { runGitCommandOutput, runGitCommandStatus } from './process-spawn';
import { isUnsafeScriptArgument } from './script-execution';

const isGitFolderPresent = (folderPath: string): boolean => {
	try {
		const fsModule = loadModule('fs');
		const existsSyncFunction = getRequiredFunction(fsModule, 'existsSync');
		const normalizedPath = folderPath.replace(/[\\/]+$/, '');
		const gitPath = `${normalizedPath}/.git`;
		// .git can be a directory (regular repo) or a file (worktree)
		return existsSyncFunction(gitPath) === true;
	} catch {
		return false;
	}
};

export const isGitRepositoryFolder = (folderPath: string): boolean => {
	if (folderPath.trim() === '') {
		return false;
	}

	return isGitFolderPresent(folderPath);
};

export const listActiveWorktrees = (repositoryFolder: string): WorktreeEntry[] => {
	if (repositoryFolder.trim() === '' || !isGitRepositoryFolder(repositoryFolder)) {
		return [];
	}

	const output = runGitCommandOutput(repositoryFolder, ['worktree', 'list', '--porcelain']);
	if (output === undefined || output.trim() === '') {
		return [];
	}

	const entries: WorktreeEntry[] = [];
	let currentPath: string | undefined;
	let currentBranch: string | undefined;
	let isBare = false;
	const lines = output.split(/\r?\n/);

	for (const line of lines) {
		const trimmedLine = line.trim();
		if (trimmedLine === '') {
			if (currentPath !== undefined) {
				entries.push({ path: currentPath, branch: currentBranch, isBare });
			}
			currentPath = undefined;
			currentBranch = undefined;
			isBare = false;
			continue;
		}

		if (trimmedLine.startsWith('worktree ')) {
			currentPath = trimmedLine.slice('worktree '.length).trim();
			continue;
		}

		if (trimmedLine.startsWith('branch refs/heads/')) {
			currentBranch = trimmedLine.slice('branch refs/heads/'.length).trim();
			continue;
		}

		if (trimmedLine === 'bare') {
			isBare = true;
		}
	}

	// Handle final entry without trailing empty line
	if (currentPath !== undefined) {
		entries.push({ path: currentPath, branch: currentBranch, isBare });
	}

	return entries;
};

export const getDefaultBranch = (repositoryFolder: string): string | undefined => {
	if (repositoryFolder.trim() === '' || !isGitRepositoryFolder(repositoryFolder)) {
		return undefined;
	}

	// Try symbolic-ref for origin HEAD first
	const symbolicRefOutput = runGitCommandOutput(repositoryFolder, [
		'symbolic-ref',
		'refs/remotes/origin/HEAD',
		'--short'
	]);
	if (symbolicRefOutput !== undefined && symbolicRefOutput.trim() !== '') {
		const trimmed = symbolicRefOutput.trim();
		// Output is like "origin/main" -- strip the "origin/" prefix
		const slashIndex = trimmed.indexOf('/');
		if (slashIndex !== -1) {
			return trimmed.slice(slashIndex + 1);
		}
		return trimmed;
	}

	// Fall back to current HEAD branch
	const headOutput = runGitCommandOutput(repositoryFolder, ['rev-parse', '--abbrev-ref', 'HEAD']);
	if (headOutput !== undefined && headOutput.trim() !== '' && headOutput.trim() !== 'HEAD') {
		return headOutput.trim();
	}

	return undefined;
};

export const getCurrentBranch = (repositoryFolder: string): string | undefined => {
	if (repositoryFolder.trim() === '' || !isGitRepositoryFolder(repositoryFolder)) {
		return undefined;
	}

	const output = runGitCommandOutput(repositoryFolder, ['rev-parse', '--abbrev-ref', 'HEAD']);
	if (output === undefined || output.trim() === '' || output.trim() === 'HEAD') {
		return undefined;
	}

	return output.trim();
};

export const findWorktreePathForBranch = (
	repositoryFolder: string,
	branchName: string
): string | undefined => {
	if (repositoryFolder.trim() === '' || branchName.trim() === '') {
		return undefined;
	}
	if (isUnsafeScriptArgument(branchName)) {
		return undefined;
	}
	if (!isGitRepositoryFolder(repositoryFolder)) {
		return undefined;
	}

	const output = runGitCommandOutput(repositoryFolder, ['worktree', 'list', '--porcelain']);
	if (output === undefined || output.trim() === '') {
		return undefined;
	}

	let currentWorktreePath: string | undefined;
	let currentBranch: string | undefined;
	const lines = output.split(/\r?\n/);
	for (const line of lines) {
		const trimmedLine = line.trim();
		if (trimmedLine === '') {
			if (currentBranch === branchName && currentWorktreePath !== undefined) {
				return currentWorktreePath;
			}
			currentWorktreePath = undefined;
			currentBranch = undefined;
			continue;
		}

		if (trimmedLine.startsWith('worktree ')) {
			currentWorktreePath = trimmedLine.slice('worktree '.length).trim();
			continue;
		}

		if (trimmedLine.startsWith('branch refs/heads/')) {
			currentBranch = trimmedLine.slice('branch refs/heads/'.length).trim();
		}
	}

	if (currentBranch === branchName && currentWorktreePath !== undefined) {
		return currentWorktreePath;
	}

	return undefined;
};

export const isGitBranchMissing = (folderPath: string, branchName: string): boolean => {
	if (folderPath.trim() === '' || branchName.trim() === '') {
		return false;
	}
	if (isUnsafeScriptArgument(branchName)) {
		return false;
	}
	if (!isGitRepositoryFolder(folderPath)) {
		return false;
	}

	const gitVersionStatus = runGitCommandStatus(folderPath, ['--version']);
	if (gitVersionStatus !== 0) {
		return false;
	}

	const localBranchStatus = runGitCommandStatus(folderPath, [
		'rev-parse',
		'--verify',
		'--quiet',
		`refs/heads/${branchName}`
	]);
	if (localBranchStatus === 0) {
		return false;
	}

	const remoteBranchStatus = runGitCommandStatus(folderPath, [
		'rev-parse',
		'--verify',
		'--quiet',
		`refs/remotes/origin/${branchName}`
	]);
	return remoteBranchStatus !== 0;
};

export const checkBranchExists = (
	repositoryFolder: string,
	branchName: string
): 'local' | 'remote' | 'none' => {
	if (repositoryFolder.trim() === '' || branchName.trim() === '') {
		return 'none';
	}
	if (isUnsafeScriptArgument(branchName)) {
		return 'none';
	}
	if (!isGitRepositoryFolder(repositoryFolder)) {
		return 'none';
	}

	// Check remote first -- a pushed branch is active regardless of local state
	const remoteStatus = runGitCommandStatus(repositoryFolder, [
		'rev-parse',
		'--verify',
		'--quiet',
		`refs/remotes/origin/${branchName}`
	]);
	if (remoteStatus === 0) {
		return 'remote';
	}

	const localStatus = runGitCommandStatus(repositoryFolder, [
		'rev-parse',
		'--verify',
		'--quiet',
		`refs/heads/${branchName}`
	]);
	if (localStatus === 0) {
		return 'local';
	}

	// Fallback: git branch --list is more portable on Windows/MINGW64
	const branchListOutput = runGitCommandOutput(repositoryFolder, [
		'branch',
		'--list',
		branchName
	]);
	if (branchListOutput !== undefined && branchListOutput.trim() !== '') {
		return 'local';
	}

	return 'none';
};

export const getGitRemoteUrl = (repositoryFolder: string): string | undefined => {
	if (repositoryFolder.trim() === '' || !isGitRepositoryFolder(repositoryFolder)) {
		return undefined;
	}

	const output = runGitCommandOutput(repositoryFolder, ['remote', 'get-url', 'origin']);
	if (output === undefined || output.trim() === '') {
		return undefined;
	}

	return output.trim();
};

export const hasBranchUpstreamConfig = (repositoryFolder: string, branchName: string): boolean => {
	if (repositoryFolder.trim() === '' || branchName.trim() === '') {
		return false;
	}
	if (isUnsafeScriptArgument(branchName)) {
		return false;
	}

	// git config branch.<name>.remote -- returns 0 if upstream tracking was configured
	const status = runGitCommandStatus(repositoryFolder, ['config', `branch.${branchName}.remote`]);
	return status === 0;
};

import { slugify } from '../utils/slugify';

export const WORKTREE_FIELD = 'worktree';
export const WORKTREE_BRANCH_FIELD = 'worktree_branch';
export const WORKTREE_ORIGIN_FOLDER_FIELD = 'worktree_origin_folder';
export const WORKTREE_EXPECTED_FOLDER_FIELD = 'worktree_expected_folder';
export const WORKTREE_SETUP_STATE_FIELD = 'worktree_setup_state';
export const WORKTREE_BASE_REPOSITORY_FIELD = 'worktree_base_repository';
export const WORKTREE_BASE_BRANCH_FIELD = 'worktree_base_branch';
export const WORKTREE_SETUP_POLL_INTERVAL_MS = 1000;
export const WORKTREE_SETUP_TIMEOUT_MS = 10_000;

export const EMPTY_BRANCH_NAME = '';
export const CURRENT_DIRECTORY_BRANCH = '.';
export const PARENT_DIRECTORY_BRANCH = '..';
export const LEADING_DASH_PATTERN = /^-+/;
export const TRAILING_DASH_PATTERN = /-+$/;

export function getExpectedWorktreeFolder(
	worktreeOriginFolder: string | undefined,
	worktreeBranch: string
): string | undefined {
	if (worktreeOriginFolder === undefined || worktreeOriginFolder.trim() === '') {
		return undefined;
	}

	const normalizedOrigin = worktreeOriginFolder.replace(/[\\/]+$/, '');
	const parentFolder = normalizedOrigin.replace(/[\\/][^\\/]+$/, '');
	if (parentFolder === '') {
		return undefined;
	}

	const separator = parentFolder.includes('\\') ? '\\' : '/';
	return `${parentFolder}${separator}worktrees${separator}${worktreeBranch}`;
}

export function isValidGitBranchName(branchName: string): boolean {
	if (branchName === EMPTY_BRANCH_NAME) {
		return false;
	}

	if (branchName === CURRENT_DIRECTORY_BRANCH || branchName === PARENT_DIRECTORY_BRANCH) {
		return false;
	}

	if (branchName.startsWith('-')) {
		return false;
	}

	return /^[a-z0-9_][a-z0-9_-]*$/.test(branchName);
}

export function sanitizeGitBranchName(preferredName: string, fallbackName: string): string {
	const preferredCandidate = slugify(preferredName)
		.replace(LEADING_DASH_PATTERN, '')
		.replace(TRAILING_DASH_PATTERN, '');
	if (isValidGitBranchName(preferredCandidate)) {
		return preferredCandidate;
	}

	const fallbackCandidate = slugify(fallbackName)
		.replace(LEADING_DASH_PATTERN, '')
		.replace(TRAILING_DASH_PATTERN, '');
	if (isValidGitBranchName(fallbackCandidate)) {
		return fallbackCandidate;
	}

	return 'worktree';
}

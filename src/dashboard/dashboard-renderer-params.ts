import type { Priority } from '../types';
import { ControlParams, ParsedKeyValueLine } from './dashboard-renderer-types';

function parsePriority(value: string): Priority | undefined {
	if (value === 'low' || value === 'medium' || value === 'high' || value === 'top') {
		return value;
	}

	return undefined;
}

function parseBoolean(value: string): boolean | undefined {
	if (value === 'true') {
		return true;
	}
	if (value === 'false') {
		return false;
	}

	return undefined;
}

function parseWorktreeSetupState(value: string): 'pending' | 'active' | 'failed' | undefined {
	if (value === 'pending' || value === 'active' || value === 'failed') {
		return value;
	}

	return undefined;
}

export const parseSourceKeyValueLines = (source: string): ParsedKeyValueLine[] => {
	const entries: ParsedKeyValueLine[] = [];
	for (const line of source.trim().split('\n')) {
		const [key, ...valueParts] = line.split(':');
		const value = valueParts.join(':').trim();
		const trimmedKey = key.trim();
		if (trimmedKey === '' || value === '') {
			continue;
		}
		entries.push({ key: trimmedKey, value });
	}
	return entries;
};

export const parseParams = (source: string): ControlParams | null => {
	const params: Partial<ControlParams> = {};
	const collectedGithubLinks: string[] = [];

	for (const line of parseSourceKeyValueLines(source)) {
		switch (line.key) {
			case 'issue':
				params.issue = line.value;
				break;
			case 'name':
				params.name = line.value;
				break;
			case 'path':
				params.path = line.value;
				break;
			case 'dashboard':
				params.dashboard = line.value;
				break;
			case 'priority': {
				const priority = parsePriority(line.value);
				if (priority !== undefined) {
					params.priority = priority;
				}
				break;
			}
			case 'github':
				params.github = line.value;
				collectedGithubLinks.push(line.value);
				break;
			case 'github_link':
				collectedGithubLinks.push(line.value);
				break;
			case 'worktree': {
				const worktree = parseBoolean(line.value);
				if (worktree !== undefined) {
					params.worktree = worktree;
				}
				break;
			}
			case 'worktree_branch':
				params.worktree_branch = line.value;
				break;
			case 'worktree_origin_folder':
				params.worktree_origin_folder = line.value;
				break;
			case 'worktree_expected_folder':
				params.worktree_expected_folder = line.value;
				break;
			case 'worktree_setup_state': {
				const setupState = parseWorktreeSetupState(line.value);
				if (setupState !== undefined) {
					params.worktree_setup_state = setupState;
				}
				break;
			}
			case 'worktree_base_repository':
				params.worktree_base_repository = line.value;
				break;
			case 'worktree_safe_delete': {
				const worktreeSafeDelete = parseBoolean(line.value);
				if (worktreeSafeDelete !== undefined) {
					params.worktree_safe_delete = worktreeSafeDelete;
				}
				break;
			}
			default:
				break;
		}
	}

	params.githubLinks = collectedGithubLinks;

	const hasAllParams =
		params.issue !== undefined &&
		params.name !== undefined &&
		params.path !== undefined &&
		params.dashboard !== undefined &&
		params.priority !== undefined;

	if (hasAllParams) {
		return params as ControlParams;
	}

	return null;
};

export const parseGitHubNoteParams = (
	source: string
): { url: string; dashboard?: string } | undefined => {
	let url: string | undefined;
	let dashboardId: string | undefined;

	for (const line of parseSourceKeyValueLines(source)) {
		if (line.key === 'url') {
			url = line.value;
		} else if (line.key === 'dashboard') {
			dashboardId = line.value;
		}
	}

	if (url === undefined) {
		return undefined;
	}

	return { url, dashboard: dashboardId };
};

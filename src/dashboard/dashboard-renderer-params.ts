import type { Priority } from '../types';
import { ControlParams, ParsedKeyValueLine } from './dashboard-renderer-types';

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
		if (line.key === 'priority') {
			params.priority = line.value as Priority;
			continue;
		}
		if (line.key === 'github') {
			params.github = line.value;
			collectedGithubLinks.push(line.value);
			continue;
		}
		if (line.key === 'github_link') {
			collectedGithubLinks.push(line.value);
			continue;
		}
		const key = line.key as keyof ControlParams;
		(params as Record<string, unknown>)[key] = line.value;
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

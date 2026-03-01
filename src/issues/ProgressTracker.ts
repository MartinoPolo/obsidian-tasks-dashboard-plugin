import { App, TFile } from 'obsidian';
import { IssueProgress } from '../types';

export interface ProgressTrackerInstance {
	getProgress: (filePath: string) => Promise<IssueProgress>;
	invalidateCache: (filePath: string) => void;
	invalidateAllCache: () => void;
}

interface ProgressCacheEntry {
	progress: IssueProgress;
	timestamp: number;
}

const CACHE_DURATION_MS = 5000;
const TASK_CHECKBOX_PATTERN = /^[\s]*[-*]\s*\[([ xX])\]/gm;
const EMPTY_PROGRESS: IssueProgress = { done: 0, total: 0, percentage: 0 };

const calculatePercentage = (done: number, total: number): number => {
	if (total === 0) {
		return 0;
	}

	return Math.round((done / total) * 100);
};

const countTasks = (content: string): IssueProgress => {
	const taskCheckboxRegex = new RegExp(TASK_CHECKBOX_PATTERN);
	let done = 0;
	let total = 0;
	let match: RegExpExecArray | null = taskCheckboxRegex.exec(content);

	while (match !== null) {
		total++;
		if (match[1].toLowerCase() === 'x') {
			done++;
		}

		match = taskCheckboxRegex.exec(content);
	}

	return {
		done,
		total,
		percentage: calculatePercentage(done, total),
	};
};

const isCacheEntryFresh = (entry: ProgressCacheEntry | undefined, now: number): entry is ProgressCacheEntry => {
	if (entry === undefined) {
		return false;
	}

	return now - entry.timestamp < CACHE_DURATION_MS;
};

const resolveFile = (app: App, filePath: string): TFile | undefined => {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!(file instanceof TFile)) {
		return undefined;
	}

	return file;
};

export function createProgressTracker(app: App): ProgressTrackerInstance {
	const cache = new Map<string, ProgressCacheEntry>();

	const getProgress = async (filePath: string): Promise<IssueProgress> => {
		const now = Date.now();
		const cached = cache.get(filePath);
		if (isCacheEntryFresh(cached, now)) {
			return cached.progress;
		}

		const file = resolveFile(app, filePath);
		if (file === undefined) {
			return EMPTY_PROGRESS;
		}

		const content = await app.vault.read(file);
		const progress = countTasks(content);
		cache.set(filePath, { progress, timestamp: Date.now() });
		return progress;
	};

	const invalidateCache = (filePath: string): void => {
		cache.delete(filePath);
	};

	const invalidateAllCache = (): void => {
		cache.clear();
	};

	return { getProgress, invalidateCache, invalidateAllCache };
}

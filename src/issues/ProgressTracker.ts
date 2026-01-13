import { App, TFile } from 'obsidian';
import { IssueProgress } from '../types';

export interface ProgressTrackerInstance {
	getProgress: (filePath: string) => Promise<IssueProgress>;
}

export function createProgressTracker(app: App): ProgressTrackerInstance {
	const cache = new Map<string, { progress: IssueProgress; timestamp: number }>();
	const CACHE_DURATION = 5000;

	const countTasks = (content: string): IssueProgress => {
		const taskRegex = /^[\s]*[-*]\s*\[([ xX])\]/gm;
		let done = 0;
		let total = 0;
		let match;
		while ((match = taskRegex.exec(content)) !== null) {
			total++;
			if (match[1].toLowerCase() === 'x') {
				done++;
			}
		}
		const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
		return { done, total, percentage };
	};

	const getProgress = async (filePath: string): Promise<IssueProgress> => {
		const cached = cache.get(filePath);
		if (cached !== undefined && Date.now() - cached.timestamp < CACHE_DURATION) {
			return cached.progress;
		}
		const file = app.vault.getAbstractFileByPath(filePath);
		if (file === null || !(file instanceof TFile)) {
			return { done: 0, total: 0, percentage: 0 };
		}
		const content = await app.vault.cachedRead(file);
		const progress = countTasks(content);
		cache.set(filePath, { progress, timestamp: Date.now() });
		return progress;
	};

	return { getProgress };
}

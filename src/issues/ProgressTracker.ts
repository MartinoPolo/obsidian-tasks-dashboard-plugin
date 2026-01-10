import { App, TFile } from 'obsidian';
import { IssueProgress } from '../types';
export class ProgressTracker {
    private app: App;
    private cache: Map<string, { progress: IssueProgress; timestamp: number }> = new Map();
    private cacheDuration = 5000;
    constructor(app: App) {
        this.app = app;
    }
    async getProgress(filePath: string): Promise<IssueProgress> {
        const cached = this.cache.get(filePath);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            return cached.progress;
        }
        const file = this.app.vault.getAbstractFileByPath(filePath);
        if (!file || !(file instanceof TFile)) {
            return { done: 0, total: 0, percentage: 0 };
        }
        const content = await this.app.vault.cachedRead(file);
        const progress = this.countTasks(content);
        this.cache.set(filePath, { progress, timestamp: Date.now() });
        return progress;
    }
    private countTasks(content: string): IssueProgress {
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
    }
    invalidateCache(filePath?: string): void {
        if (filePath) {
            this.cache.delete(filePath);
        } else {
            this.cache.clear();
        }
    }
}

export type Priority = 'low' | 'medium' | 'high' | 'top';
export type IssueStatus = 'active' | 'archived';
export type ProgressDisplayMode = 'number' | 'percentage' | 'bar' | 'number-percentage' | 'all';
export interface Issue {
    id: string;
    name: string;
    priority: Priority;
    status: IssueStatus;
    created: string;
    githubLink?: string;
    filePath: string;
}
export interface DashboardConfig {
    id: string;
    name: string;
    rootPath: string;
}
export interface TasksDashboardSettings {
    dashboards: DashboardConfig[];
    progressDisplayMode: ProgressDisplayMode;
}
export interface IssueProgress {
    done: number;
    total: number;
    percentage: number;
}
export const DEFAULT_SETTINGS: TasksDashboardSettings = {
    dashboards: [],
    progressDisplayMode: 'all'
};
export const PRIORITY_COLORS: Record<Priority, string> = {
    low: '#4caf50',
    medium: '#ff9800',
    high: '#f44336',
    top: '#9c27b0'
};
export const PRIORITY_ORDER: Record<Priority, number> = {
    top: 0,
    high: 1,
    medium: 2,
    low: 3
};

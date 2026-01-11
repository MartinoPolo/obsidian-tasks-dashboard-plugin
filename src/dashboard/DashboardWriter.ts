import { App, TFile, Notice } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, Issue, PRIORITY_ORDER } from '../types';
import { DashboardParser } from './DashboardParser';
export class DashboardWriter {
    private app: App;
    private plugin: TasksDashboardPlugin;
    private parser: DashboardParser;
    constructor(app: App, plugin: TasksDashboardPlugin) {
        this.app = app;
        this.plugin = plugin;
        this.parser = new DashboardParser();
    }
    async addIssueToDashboard(dashboard: DashboardConfig, issue: Issue): Promise<void> {
        const dashboardPath = `${dashboard.rootPath}/dashboard.md`;
        let file = this.app.vault.getAbstractFileByPath(dashboardPath) as TFile;
        if (!file) {
            const content = this.parser.initializeStructure(dashboard.id);
            await this.app.vault.create(dashboardPath, content);
            file = this.app.vault.getAbstractFileByPath(dashboardPath) as TFile;
        }
        let content = await this.app.vault.read(file);
        if (!this.parser.hasMarkers(content)) {
            content = this.parser.initializeStructure(dashboard.id);
        }
        const issueEntry = this.buildIssueEntry(issue, dashboard);
        const activeEndMarker = '%% TASKS-DASHBOARD:ACTIVE:END %%';
        const insertIndex = content.indexOf(activeEndMarker);
        if (insertIndex === -1) {
            throw new Error('Dashboard structure is invalid');
        }
        content = content.slice(0, insertIndex) + issueEntry + '\n' + content.slice(insertIndex);
        await this.app.vault.modify(file, content);
    }
    async moveIssueToArchive(dashboard: DashboardConfig, issueId: string): Promise<void> {
        const dashboardPath = `${dashboard.rootPath}/dashboard.md`;
        const file = this.app.vault.getAbstractFileByPath(dashboardPath) as TFile;
        if (!file) return;
        let content = await this.app.vault.read(file);
        const issueStartMarker = `%% ISSUE:${issueId}:START %%`;
        const issueEndMarker = `%% ISSUE:${issueId}:END %%`;
        const startIndex = content.indexOf(issueStartMarker);
        const endIndex = content.indexOf(issueEndMarker);
        if (startIndex === -1 || endIndex === -1) return;
        const issueBlock = content.substring(startIndex, endIndex + issueEndMarker.length);
        content = content.slice(0, startIndex) + content.slice(endIndex + issueEndMarker.length);
        const separatorAfter = content.indexOf('---\n', startIndex);
        if (separatorAfter !== -1 && separatorAfter < startIndex + 10) {
            content = content.slice(0, startIndex) + content.slice(separatorAfter + 4);
        }
        const archiveEnd = '%% TASKS-DASHBOARD:ARCHIVE:END %%';
        const archiveInsertIndex = content.indexOf(archiveEnd);
        if (archiveInsertIndex !== -1) {
            const updatedBlock = issueBlock.replace(/issues\/active/g, 'issues/archive');
            content = content.slice(0, archiveInsertIndex) + updatedBlock + '\n---\n' + content.slice(archiveInsertIndex);
        }
        await this.app.vault.modify(file, content);
    }
    async moveIssue(dashboard: DashboardConfig, issueId: string, direction: 'up' | 'down'): Promise<void> {
        const dashboardPath = `${dashboard.rootPath}/dashboard.md`;
        const file = this.app.vault.getAbstractFileByPath(dashboardPath) as TFile;
        if (!file) return;
        let content = await this.app.vault.read(file);
        const parsed = this.parser.parse(content);
        const issueIndex = parsed.activeIssues.findIndex(i => i.id === issueId);
        if (issueIndex === -1) return;
        const swapIndex = direction === 'up' ? issueIndex - 1 : issueIndex + 1;
        if (swapIndex < 0 || swapIndex >= parsed.activeIssues.length) return;
        const currentIssue = parsed.activeIssues[issueIndex];
        const swapIssue = parsed.activeIssues[swapIndex];
        const currentBlock = content.substring(currentIssue.startIndex, currentIssue.endIndex);
        const swapBlock = content.substring(swapIssue.startIndex, swapIssue.endIndex);
        if (direction === 'up') {
            content = content.slice(0, swapIssue.startIndex) +
                      currentBlock +
                      content.slice(swapIssue.endIndex, currentIssue.startIndex) +
                      swapBlock +
                      content.slice(currentIssue.endIndex);
        } else {
            content = content.slice(0, currentIssue.startIndex) +
                      swapBlock +
                      content.slice(currentIssue.endIndex, swapIssue.startIndex) +
                      currentBlock +
                      content.slice(swapIssue.endIndex);
        }
        await this.app.vault.modify(file, content);
    }
    async sortByPriority(dashboard: DashboardConfig): Promise<void> {
        const dashboardPath = `${dashboard.rootPath}/dashboard.md`;
        const file = this.app.vault.getAbstractFileByPath(dashboardPath) as TFile;
        if (!file) return;
        let content = await this.app.vault.read(file);
        const parsed = this.parser.parse(content);
        if (parsed.activeIssues.length < 2) return;
        const sortedIssues = [...parsed.activeIssues].sort((a, b) =>
            PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        );
        const blocks: string[] = [];
        for (const issue of parsed.activeIssues) {
            const block = content.substring(issue.startIndex, issue.endIndex);
            blocks.push(block);
        }
        const sortedBlocks = sortedIssues.map(issue => {
            const originalIndex = parsed.activeIssues.findIndex(i => i.id === issue.id);
            return blocks[originalIndex];
        });
        const activeStartMarker = '%% TASKS-DASHBOARD:ACTIVE:START %%';
        const activeEndMarker = '%% TASKS-DASHBOARD:ACTIVE:END %%';
        const activeStart = content.indexOf(activeStartMarker) + activeStartMarker.length;
        const activeEnd = content.indexOf(activeEndMarker);
        const beforeActive = content.slice(0, activeStart);
        const afterActive = content.slice(activeEnd);
        const sortBlock = '```tasks-dashboard-sort\ndashboard: ' + dashboard.id + '\n```\n';
        // Clean up blocks - ensure consistent formatting
        const cleanedBlocks = sortedBlocks.map(block => block.trim());
        const newActiveSection = '\n' + sortBlock + cleanedBlocks.join('\n\n') + '\n';
        content = beforeActive + newActiveSection + afterActive;
        await this.app.vault.modify(file, content);
        new Notice('Issues sorted by priority');
    }
    private buildIssueEntry(issue: Issue, dashboard: DashboardConfig): string {
        const relativePath = `issues/active/${issue.id}`;
        return `%% ISSUE:${issue.id}:START %%
\`\`\`tasks-dashboard-controls
issue: ${issue.id}
name: ${issue.name}
path: ${issue.filePath}
dashboard: ${dashboard.id}
priority: ${issue.priority}
\`\`\`
\`\`\`tasks
path includes ${relativePath}
not done
limit 10
sort by priority
short mode
hide task count
hide tags
\`\`\`
---
%% ISSUE:${issue.id}:END %%`;
    }
}

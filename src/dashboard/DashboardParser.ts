import { Priority } from '../types';
export interface ParsedIssue {
    id: string;
    name: string;
    priority: Priority;
    filePath: string;
    startIndex: number;
    endIndex: number;
}
export interface ParsedDashboard {
    activeIssues: ParsedIssue[];
    archivedIssues: ParsedIssue[];
    activeStartIndex: number;
    activeEndIndex: number;
    archiveStartIndex: number;
    archiveEndIndex: number;
}
export class DashboardParser {
    private readonly ACTIVE_START = '%% TASKS-DASHBOARD:ACTIVE:START %%';
    private readonly ACTIVE_END = '%% TASKS-DASHBOARD:ACTIVE:END %%';
    private readonly ARCHIVE_START = '%% TASKS-DASHBOARD:ARCHIVE:START %%';
    private readonly ARCHIVE_END = '%% TASKS-DASHBOARD:ARCHIVE:END %%';
    parse(content: string): ParsedDashboard {
        const activeStartIndex = content.indexOf(this.ACTIVE_START);
        const activeEndIndex = content.indexOf(this.ACTIVE_END);
        const archiveStartIndex = content.indexOf(this.ARCHIVE_START);
        const archiveEndIndex = content.indexOf(this.ARCHIVE_END);
        const activeIssues = this.parseIssuesInRange(
            content,
            activeStartIndex !== -1 ? activeStartIndex : 0,
            activeEndIndex !== -1 ? activeEndIndex : content.length
        );
        const archivedIssues = this.parseIssuesInRange(
            content,
            archiveStartIndex !== -1 ? archiveStartIndex : content.length,
            archiveEndIndex !== -1 ? archiveEndIndex : content.length
        );
        return {
            activeIssues,
            archivedIssues,
            activeStartIndex,
            activeEndIndex,
            archiveStartIndex,
            archiveEndIndex
        };
    }
    private parseIssuesInRange(content: string, start: number, end: number): ParsedIssue[] {
        const issues: ParsedIssue[] = [];
        const section = content.substring(start, end);
        const issueRegex = /%% ISSUE:([\w-]+):START %%([\s\S]*?)%% ISSUE:\1:END %%/g;
        let match;
        while ((match = issueRegex.exec(section)) !== null) {
            const issueContent = match[2];
            const nameMatch = issueContent.match(/name:\s*(.+)/);
            const pathMatch = issueContent.match(/path:\s*(.+)/);
            const priorityMatch = issueContent.match(/priority:\s*(low|medium|high|top)/);
            if (nameMatch && pathMatch) {
                issues.push({
                    id: match[1],
                    name: nameMatch[1].trim(),
                    priority: (priorityMatch ? priorityMatch[1].trim() : 'medium') as Priority,
                    filePath: pathMatch[1].trim(),
                    startIndex: start + match.index,
                    endIndex: start + match.index + match[0].length
                });
            }
        }
        return issues;
    }
    hasMarkers(content: string): boolean {
        return content.includes(this.ACTIVE_START) &&
               content.includes(this.ACTIVE_END) &&
               content.includes(this.ARCHIVE_START) &&
               content.includes(this.ARCHIVE_END);
    }
    initializeStructure(dashboardId: string): string {
        return `# Active Issues
${this.ACTIVE_START}
\`\`\`tasks-dashboard-sort
dashboard: ${dashboardId}
\`\`\`
${this.ACTIVE_END}
# Archive
${this.ARCHIVE_START}
${this.ARCHIVE_END}
---
## How to Use This Dashboard
- Press \`Ctrl+Shift+E\` to create a new issue
- Use ↑↓ buttons to reorder issues
- Click 🗑️ to archive completed issues
- Click "Sort by Priority" to auto-organize
- Add tasks in issue notes using \`- [ ] Task name\``;
    }
}

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

export const MARKERS = {
	ACTIVE_START: '%% TASKS-DASHBOARD:ACTIVE:START %%',
	ACTIVE_END: '%% TASKS-DASHBOARD:ACTIVE:END %%',
	ARCHIVE_START: '%% TASKS-DASHBOARD:ARCHIVE:START %%',
	ARCHIVE_END: '%% TASKS-DASHBOARD:ARCHIVE:END %%'
} as const;

export function parseDashboard(content: string): ParsedDashboard {
	const activeStartIndex = content.indexOf(MARKERS.ACTIVE_START);
	const activeEndIndex = content.indexOf(MARKERS.ACTIVE_END);
	const archiveStartIndex = content.indexOf(MARKERS.ARCHIVE_START);
	const archiveEndIndex = content.indexOf(MARKERS.ARCHIVE_END);

	const activeIssues = parseIssuesInRange(
		content,
		activeStartIndex !== -1 ? activeStartIndex : 0,
		activeEndIndex !== -1 ? activeEndIndex : content.length
	);

	const archivedIssues = parseIssuesInRange(
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

export function parseIssuesInRange(content: string, start: number, end: number): ParsedIssue[] {
	const issues: ParsedIssue[] = [];
	const section = content.substring(start, end);
	const issueRegex = /%% ISSUE:([\w-]+):START %%([\s\S]*?)%% ISSUE:\1:END %%/g;

	for (const match of section.matchAll(issueRegex)) {
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
				startIndex: start + match.index!,
				endIndex: start + match.index! + match[0].length
			});
		}
	}

	return issues;
}

export function hasMarkers(content: string): boolean {
	return (
		content.includes(MARKERS.ACTIVE_START) &&
		content.includes(MARKERS.ACTIVE_END) &&
		content.includes(MARKERS.ARCHIVE_START) &&
		content.includes(MARKERS.ARCHIVE_END)
	);
}

export function initializeDashboardStructure(dashboardId: string): string {
	return `# Active Issues
${MARKERS.ACTIVE_START}
\`\`\`tasks-dashboard-sort
dashboard: ${dashboardId}
\`\`\`
${MARKERS.ACTIVE_END}
# Notes
%% TASKS-DASHBOARD:NOTES %%
# Archive
${MARKERS.ARCHIVE_START}
${MARKERS.ARCHIVE_END}
# How to Use This Dashboard
- Press "+ Add issue" or keyboard shortcut (set your hotkey in settings)
- Use ↑↓ buttons to reorder issues
- Click 🗑️ to archive completed issues
- Click "Sort by Priority" to auto-organize
- Add tasks in issue notes using \`- [ ] Task name\``;
}

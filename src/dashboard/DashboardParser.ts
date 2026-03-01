import { Priority } from '../types';

interface SectionRange {
	start: number;
	end: number;
}

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

const ISSUE_BLOCK_REGEX = /%% ISSUE:([\w-]+):START %%([\s\S]*?)%% ISSUE:\1:END %%/g;
const PRIORITY_REGEX = /priority:\s*(low|medium|high|top)/;
const NAME_REGEX = /name:\s*(.+)/;
const PATH_REGEX = /path:\s*(.+)/;
const VALID_PRIORITIES: readonly Priority[] = ['low', 'medium', 'high', 'top'];

const resolveSectionRange = (
	startIndex: number,
	endIndex: number,
	fallbackStart: number,
	fallbackEnd: number
): SectionRange => {
	return {
		start: startIndex === -1 ? fallbackStart : startIndex,
		end: endIndex === -1 ? fallbackEnd : endIndex
	};
};

const extractField = (issueContent: string, fieldRegex: RegExp): string | undefined => {
	const match = issueContent.match(fieldRegex);
	if (match === null) {
		return undefined;
	}

	return match[1].trim();
};

const isPriority = (value: string): value is Priority => {
	return (
		value === VALID_PRIORITIES[0] ||
		value === VALID_PRIORITIES[1] ||
		value === VALID_PRIORITIES[2] ||
		value === VALID_PRIORITIES[3]
	);
};

const parsePriority = (issueContent: string): Priority => {
	const rawPriority = extractField(issueContent, PRIORITY_REGEX);
	if (rawPriority === undefined) {
		return 'medium';
	}

	return isPriority(rawPriority) ? rawPriority : 'medium';
};

export function parseDashboard(content: string): ParsedDashboard {
	const activeStartIndex = content.indexOf(MARKERS.ACTIVE_START);
	const activeEndIndex = content.indexOf(MARKERS.ACTIVE_END);
	const archiveStartIndex = content.indexOf(MARKERS.ARCHIVE_START);
	const archiveEndIndex = content.indexOf(MARKERS.ARCHIVE_END);
	const contentLength = content.length;

	const activeRange = resolveSectionRange(activeStartIndex, activeEndIndex, 0, contentLength);
	const archiveRange = resolveSectionRange(
		archiveStartIndex,
		archiveEndIndex,
		contentLength,
		contentLength
	);

	const activeIssues = parseIssuesInRange(content, activeRange.start, activeRange.end);
	const archivedIssues = parseIssuesInRange(content, archiveRange.start, archiveRange.end);

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

	for (const match of section.matchAll(ISSUE_BLOCK_REGEX)) {
		const fullMatch = match[0];
		const issueId = match[1];
		const issueContent = match[2];
		const issueStartOffset = match.index;

		const name = extractField(issueContent, NAME_REGEX);
		const filePath = extractField(issueContent, PATH_REGEX);
		if (name === undefined || filePath === undefined) {
			continue;
		}

		issues.push({
			id: issueId,
			name,
			priority: parsePriority(issueContent),
			filePath,
			startIndex: start + issueStartOffset,
			endIndex: start + issueStartOffset + fullMatch.length
		});
	}

	return issues;
}

export function hasMarkers(content: string): boolean {
	return Object.values(MARKERS).every((marker) => content.includes(marker));
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
- Press "+ Add issue" or use your dashboard hotkey
- Use Row 1 actions in each issue header; hidden actions are available in the always-visible 3-dots menu
- Use overflow "Layout settings" to configure dashboard-wide Row 1/Row 2 action placement and show/hide actions
- Use ↑/↓ to reorder quickly; right-click ↑ for move-to-top and right-click ↓ for move-to-bottom
- Use archive to move issues to Archive, and use delete/rename/recolor/folder link actions as needed
- Terminal and VS Code actions require an assigned issue folder
- This How to Use section is optional and can be removed if you prefer
- Add tasks in issue notes using \`- [ ] Task name\``;
}

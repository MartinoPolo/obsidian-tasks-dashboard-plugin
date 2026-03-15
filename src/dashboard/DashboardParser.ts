import { Priority } from '../types';
import { buildHowToSection } from './dashboard-howto-section';
import { DASHBOARD_MARKERS } from './dashboard-markers';
import { parsePriority } from './priority-utils';
import { buildDashboardDisplayName } from './dashboard-writer-helpers';

export { DASHBOARD_MARKERS as MARKERS } from './dashboard-markers';

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

const ISSUE_BLOCK_REGEX = /%% ISSUE:([\w-]+):START %%([\s\S]*?)%% ISSUE:\1:END %%/g;
const PRIORITY_REGEX = /priority:\s*(low|medium|high|top)/;
const NAME_REGEX = /name:\s*(.+)/;
const PATH_REGEX = /path:\s*(.+)/;

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

const parseIssuePriority = (issueContent: string): Priority => {
	const rawPriority = extractField(issueContent, PRIORITY_REGEX);
	return parsePriority(rawPriority);
};

export function parseDashboard(content: string): ParsedDashboard {
	const activeStartIndex = content.indexOf(DASHBOARD_MARKERS.ACTIVE_START);
	const activeEndIndex = content.indexOf(DASHBOARD_MARKERS.ACTIVE_END);
	const archiveStartIndex = content.indexOf(DASHBOARD_MARKERS.ARCHIVE_START);
	const archiveEndIndex = content.indexOf(DASHBOARD_MARKERS.ARCHIVE_END);
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
			priority: parseIssuePriority(issueContent),
			filePath,
			startIndex: start + issueStartOffset,
			endIndex: start + issueStartOffset + fullMatch.length
		});
	}

	return issues;
}

export function hasMarkers(content: string): boolean {
	return Object.values(DASHBOARD_MARKERS).every((marker) => content.includes(marker));
}

export function initializeDashboardStructure(
	dashboardId: string,
	includeAssignedIssuesSection = false,
	dashboardFilename?: string
): string {
	const displayName = buildDashboardDisplayName(dashboardFilename);
	const assignedIssuesSection = includeAssignedIssuesSection
		? `# Assigned Issues
\`\`\`tasks-dashboard-assigned
dashboard: ${dashboardId}
\`\`\`
`
		: '';

	return `# ${displayName}
\`\`\`tasks-dashboard-sort
dashboard: ${dashboardId}
\`\`\`
# Active Issues
${DASHBOARD_MARKERS.ACTIVE_START}
${DASHBOARD_MARKERS.ACTIVE_END}
${assignedIssuesSection}# Notes
%% TASKS-DASHBOARD:NOTES %%
# Archive
${DASHBOARD_MARKERS.ARCHIVE_START}
${DASHBOARD_MARKERS.ARCHIVE_END}
${buildHowToSection()}`;
}

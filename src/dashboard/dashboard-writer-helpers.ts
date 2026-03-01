import { TFile } from 'obsidian';
import { DashboardConfig, Issue, Priority, PRIORITY_ORDER } from '../types';
import { buildIssueMarkerEnd, buildIssueMarkerStart, DASHBOARD_NOTES_MARKER } from './dashboard-markers';
import {
	ARCHIVE_HEADER,
	FORBIDDEN_PROTO_KEYS,
	ISSUE_ACTIVE_FOLDER,
	ISSUE_ARCHIVE_FOLDER,
	ISSUE_SECTION_ROOT,
	NOTES_HEADER,
	SECTION_SEPARATOR,
	YAML_FRONTMATTER_REGEX
} from './dashboard-writer-constants';
import {
	ExtractedIssueBlock,
	IssueBlockParams,
	ParsedDashboardIssue,
	ParsedIssueFile
} from './dashboard-writer-types';

export const buildIssueRelativePath = (issueId: string, isArchived: boolean): string => {
	const folder = isArchived ? ISSUE_ARCHIVE_FOLDER : ISSUE_ACTIVE_FOLDER;
	return `${ISSUE_SECTION_ROOT}/${folder}/${issueId}`;
};

export const buildSortBlock = (dashboardId: string): string => {
	return `\`\`\`tasks-dashboard-sort\ndashboard: ${dashboardId}\n\`\`\`\n`;
};

export const escapeRegExp = (value: string): string => {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const removeLegacyIssueSeparator = (issueBlock: string): string => {
	return issueBlock.replace(/\n---\n(?=%% ISSUE:[\w-]+:END %%)/g, '\n');
};

export const getFrontmatterText = (content: string): string | undefined => {
	const frontmatterMatch = content.match(YAML_FRONTMATTER_REGEX);
	if (frontmatterMatch === null) {
		return undefined;
	}

	return frontmatterMatch[1];
};

export const buildIssueMarkdownBlock = (params: IssueBlockParams): string => {
	const relativePath = buildIssueRelativePath(params.id, params.isArchived);
	const githubLines = params.githubLinks.map((url) => `github_link: ${url}\n`).join('');

	return `${buildIssueMarkerStart(params.id)}
\`\`\`tasks-dashboard-controls
issue: ${params.id}
name: ${params.name}
path: ${params.filePath}
dashboard: ${params.dashboardId}
priority: ${params.priority}
${githubLines}\`\`\`
\`\`\`tasks
path includes ${relativePath}
not done
limit 10
sort by priority
short mode
hide task count
hide tags
show tree
\`\`\`
${buildIssueMarkerEnd(params.id)}`;
};

export const parseYamlFrontmatter = (content: string): Record<string, string> => {
	const frontmatterText = getFrontmatterText(content);
	if (frontmatterText === undefined) {
		return {};
	}

	const result: Record<string, string> = {};
	const lines = frontmatterText.split('\n');

	for (const line of lines) {
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) {
			continue;
		}

		const key = line.substring(0, colonIndex).trim();
		if (FORBIDDEN_PROTO_KEYS.has(key)) {
			continue;
		}

		const value = line.substring(colonIndex + 1).trim();
		result[key] = value;
	}

	return result;
};

export const extractIssueName = (content: string): string | undefined => {
	const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '');
	const headerMatch = withoutFrontmatter.match(/^#\s+(.+)$/m);
	return headerMatch !== null ? headerMatch[1].trim() : undefined;
};

export const extractGithubLinksFromFrontmatter = (content: string): string[] => {
	const frontmatterText = getFrontmatterText(content);
	if (frontmatterText === undefined) {
		return [];
	}

	const githubLinksUrls: string[] = [];
	const urlEntryPattern = /^\s+-\s*url:\s*"?([^"\n]+)"?/gm;

	if (frontmatterText.includes('github_links:')) {
		let urlMatch: RegExpExecArray | null;
		while ((urlMatch = urlEntryPattern.exec(frontmatterText)) !== null) {
			githubLinksUrls.push(urlMatch[1].trim());
		}

		if (githubLinksUrls.length > 0) {
			return githubLinksUrls;
		}
	}

	const oldGithubMatch = frontmatterText.match(/^github:\s*\n((?:\s+\w+:.*\n?)*)/m);
	if (oldGithubMatch !== null) {
		const oldUrlMatch = oldGithubMatch[0].match(/url:\s*"?([^"\n]+)"?/);
		if (oldUrlMatch !== null) {
			return [oldUrlMatch[1].trim()];
		}
	}

	return [];
};

export const extractNotesSection = (existingContent: string): string => {
	const notesMarkerIndex = existingContent.indexOf(DASHBOARD_NOTES_MARKER);
	const notesHeaderIndex = existingContent.indexOf(NOTES_HEADER);
	const archiveHeaderIndex = existingContent.indexOf(ARCHIVE_HEADER);

	if (archiveHeaderIndex === -1) {
		return '';
	}

	let notesStartIndex = -1;

	if (notesMarkerIndex !== -1 && notesMarkerIndex < archiveHeaderIndex) {
		notesStartIndex = notesMarkerIndex + DASHBOARD_NOTES_MARKER.length;
	} else if (notesHeaderIndex !== -1 && notesHeaderIndex < archiveHeaderIndex) {
		notesStartIndex = notesHeaderIndex + NOTES_HEADER.length;
	}

	if (notesStartIndex === -1) {
		return '';
	}

	const rawNotesContent = existingContent.substring(notesStartIndex, archiveHeaderIndex);
	const cleanedNotesContent = rawNotesContent.replace(/^\s*%% TASKS-DASHBOARD:NOTES %%\s*/, '');

	return cleanedNotesContent.trim();
};

export const parseIssueFile = (file: TFile, content: string): ParsedIssueFile | undefined => {
	const frontmatter = parseYamlFrontmatter(content);
	const name = extractIssueName(content);

	if (name === undefined) {
		return undefined;
	}

	const priorityValue = frontmatter['priority'];
	const priority: Priority =
		priorityValue === 'low' ||
		priorityValue === 'medium' ||
		priorityValue === 'high' ||
		priorityValue === 'top'
			? priorityValue
			: 'medium';

	return {
		id: file.basename,
		name,
		priority,
		created: frontmatter['created'] || new Date().toISOString(),
		filePath: file.path,
		githubLinks: extractGithubLinksFromFrontmatter(content)
	};
};

export const parsedIssueFileToBlockParams = (
	issueFile: ParsedIssueFile,
	isArchived: boolean,
	dashboard: DashboardConfig
): IssueBlockParams => {
	return {
		id: issueFile.id,
		name: issueFile.name,
		filePath: issueFile.filePath,
		dashboardId: dashboard.id,
		priority: issueFile.priority,
		githubLinks: issueFile.githubLinks,
		isArchived
	};
};

export const toIssueBlockParams = (issue: Issue, dashboard: DashboardConfig): IssueBlockParams => {
	const links = issue.githubLinks ?? [];
	const githubLinks =
		links.length === 0 && issue.githubLink !== undefined && issue.githubLink !== ''
			? [issue.githubLink]
			: links;

	return {
		id: issue.id,
		name: issue.name,
		filePath: issue.filePath,
		dashboardId: dashboard.id,
		priority: issue.priority,
		githubLinks,
		isArchived: false
	};
};

export const sortIssueFilesByPriorityAndCreatedDate = (a: ParsedIssueFile, b: ParsedIssueFile): number => {
	const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
	if (priorityDiff !== 0) {
		return priorityDiff;
	}

	return new Date(b.created).getTime() - new Date(a.created).getTime();
};

export const extractAndRemoveIssueBlock = (
	content: string,
	issueId: string
): ExtractedIssueBlock | undefined => {
	const issueStartMarker = buildIssueMarkerStart(issueId);
	const issueEndMarker = buildIssueMarkerEnd(issueId);
	const startIndex = content.indexOf(issueStartMarker);
	const endIndex = content.indexOf(issueEndMarker);

	if (startIndex === -1 || endIndex === -1) {
		return undefined;
	}

	const block = content.substring(startIndex, endIndex + issueEndMarker.length);
	let cleanedContent = content.slice(0, startIndex) + content.slice(endIndex + issueEndMarker.length);

	const separatorAfter = cleanedContent.indexOf(SECTION_SEPARATOR, startIndex);
	if (separatorAfter !== -1 && separatorAfter < startIndex + 10) {
		cleanedContent =
			cleanedContent.slice(0, startIndex) +
			cleanedContent.slice(separatorAfter + SECTION_SEPARATOR.length);
	}

	return { block, cleanedContent };
};

export const insertBeforeMarker = (
	content: string,
	marker: string,
	insertion: string
): string | undefined => {
	const insertIndex = content.indexOf(marker);
	if (insertIndex === -1) {
		return undefined;
	}

	return content.slice(0, insertIndex) + insertion + content.slice(insertIndex);
};

export const createIssueIdToBlockMap = (
	content: string,
	issues: ParsedDashboardIssue[]
): Map<string, string> => {
	const issueBlocks = new Map<string, string>();

	for (const issue of issues) {
		issueBlocks.set(issue.id, content.substring(issue.startIndex, issue.endIndex));
	}

	return issueBlocks;
};

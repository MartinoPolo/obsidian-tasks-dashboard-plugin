import { App, Notice, TAbstractFile, TFile } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, Issue, Priority, PRIORITY_ORDER } from '../types';
import {
	parseDashboard,
	hasMarkers,
	initializeDashboardStructure,
	MARKERS
} from './DashboardParser';
import { getDashboardPath } from '../utils/dashboard-path';

export type SortDirection = 'newest' | 'oldest';

export interface DashboardWriterInstance {
	addIssueToDashboard: (dashboard: DashboardConfig, issue: Issue) => Promise<void>;
	moveIssueToArchive: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	moveIssueToActive: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	removeIssueFromDashboard: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	moveIssue: (
		dashboard: DashboardConfig,
		issueId: string,
		direction: 'up' | 'down'
	) => Promise<void>;
	moveIssueToPosition: (
		dashboard: DashboardConfig,
		issueId: string,
		position: 'top' | 'bottom'
	) => Promise<void>;
	sortByPriority: (dashboard: DashboardConfig) => Promise<void>;
	sortByCreatedDate: (dashboard: DashboardConfig, direction: SortDirection) => Promise<void>;
	sortByEditedDate: (dashboard: DashboardConfig, direction: SortDirection) => Promise<void>;
	rebuildDashboardFromFiles: (dashboard: DashboardConfig) => Promise<number>;
}

interface IssueBlockParams {
	id: string;
	name: string;
	filePath: string;
	dashboardId: string;
	priority: Priority;
	githubLinks: string[];
	isArchived: boolean;
}

interface ParsedIssueFile {
	id: string;
	name: string;
	priority: Priority;
	created: string;
	filePath: string;
	githubLinks: string[];
}

interface ParsedDashboardIssue {
	id: string;
	priority: Priority;
	startIndex: number;
	endIndex: number;
	filePath: string;
}

interface ExtractedIssueBlock {
	block: string;
	cleanedContent: string;
}

const ISSUE_SECTION_ROOT = 'Issues';
const ISSUE_ACTIVE_FOLDER = 'Active';
const ISSUE_ARCHIVE_FOLDER = 'Archive';
const DASHBOARD_NOTES_MARKER = '%% TASKS-DASHBOARD:NOTES %%';
const NOTES_HEADER = '# Notes';
const ARCHIVE_HEADER = '# Archive';
const SECTION_SEPARATOR = '---\n';
const FORBIDDEN_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const buildIssueMarkerStart = (issueId: string): string => `%% ISSUE:${issueId}:START %%`;
const buildIssueMarkerEnd = (issueId: string): string => `%% ISSUE:${issueId}:END %%`;

const buildIssueRelativePath = (issueId: string, isArchived: boolean): string => {
	const folder = isArchived ? ISSUE_ARCHIVE_FOLDER : ISSUE_ACTIVE_FOLDER;
	return `${ISSUE_SECTION_ROOT}/${folder}/${issueId}`;
};

const buildSortBlock = (dashboardId: string): string => {
	return `\`\`\`tasks-dashboard-sort\ndashboard: ${dashboardId}\n\`\`\`\n`;
};

const escapeRegExp = (value: string): string => {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const buildIssueMarkdownBlock = (params: IssueBlockParams): string => {
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
---
${buildIssueMarkerEnd(params.id)}`;
};

const parseYamlFrontmatter = (content: string): Record<string, string> => {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
	if (frontmatterMatch === null) {
		return {};
	}

	const result: Record<string, string> = {};
	const lines = frontmatterMatch[1].split('\n');

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

const extractIssueName = (content: string): string | undefined => {
	const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '');
	const headerMatch = withoutFrontmatter.match(/^#\s+(.+)$/m);
	return headerMatch !== null ? headerMatch[1].trim() : undefined;
};

const extractGithubLinksFromFrontmatter = (content: string): string[] => {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
	if (frontmatterMatch === null) {
		return [];
	}

	const frontmatterText = frontmatterMatch[1];
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

const extractNotesSection = (existingContent: string): string => {
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

const parseIssueFile = (file: TFile, content: string): ParsedIssueFile | undefined => {
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

const parsedIssueFileToBlockParams = (
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

const toIssueBlockParams = (issue: Issue, dashboard: DashboardConfig): IssueBlockParams => {
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

const sortIssueFilesByPriorityAndCreatedDate = (a: ParsedIssueFile, b: ParsedIssueFile): number => {
	const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
	if (priorityDiff !== 0) {
		return priorityDiff;
	}

	return new Date(b.created).getTime() - new Date(a.created).getTime();
};

export function createDashboardWriter(
	app: App,
	plugin: TasksDashboardPlugin
): DashboardWriterInstance {
	const resolveFileByPath = (path: string): TFile | undefined => {
		const abstractFile: TAbstractFile | null = app.vault.getAbstractFileByPath(path);
		if (abstractFile instanceof TFile) {
			return abstractFile;
		}

		return undefined;
	};

	const getDashboardFile = (dashboard: DashboardConfig): TFile | undefined => {
		return resolveFileByPath(getDashboardPath(dashboard));
	};

	const extractAndRemoveIssueBlock = (
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
		let cleanedContent =
			content.slice(0, startIndex) + content.slice(endIndex + issueEndMarker.length);

		const separatorAfter = cleanedContent.indexOf(SECTION_SEPARATOR, startIndex);
		if (separatorAfter !== -1 && separatorAfter < startIndex + 10) {
			cleanedContent =
				cleanedContent.slice(0, startIndex) +
				cleanedContent.slice(separatorAfter + SECTION_SEPARATOR.length);
		}

		return { block, cleanedContent };
	};

	const insertBeforeMarker = (
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

	const moveIssueBetweenSections = async (
		dashboard: DashboardConfig,
		issueId: string,
		targetSectionEndMarker: string,
		pathFromFolder: string,
		pathToFolder: string
	): Promise<void> => {
		const file = getDashboardFile(dashboard);
		if (file === undefined) {
			return;
		}

		const content = await app.vault.read(file);
		const result = extractAndRemoveIssueBlock(content, issueId);
		if (result === undefined) {
			return;
		}

		const fromPath = `${ISSUE_SECTION_ROOT}/${pathFromFolder}`;
		const toPath = `${ISSUE_SECTION_ROOT}/${pathToFolder}`;
		const updatedBlock = result.block.replace(new RegExp(escapeRegExp(fromPath), 'g'), toPath);

		const inserted = insertBeforeMarker(
			result.cleanedContent,
			targetSectionEndMarker,
			`${updatedBlock}\n---\n`
		);
		if (inserted === undefined) {
			return;
		}

		await app.vault.modify(file, inserted);
	};

	const createIssueIdToBlockMap = (
		content: string,
		issues: ParsedDashboardIssue[]
	): Map<string, string> => {
		const issueBlocks = new Map<string, string>();

		for (const issue of issues) {
			issueBlocks.set(issue.id, content.substring(issue.startIndex, issue.endIndex));
		}

		return issueBlocks;
	};

	const getActiveIssueBlocksFromDashboard = async (
		dashboard: DashboardConfig
	): Promise<{ file: TFile; content: string; issues: ParsedDashboardIssue[] } | undefined> => {
		const file = getDashboardFile(dashboard);
		if (file === undefined) {
			return undefined;
		}

		const content = await app.vault.read(file);
		const parsed = parseDashboard(content);
		const issues = parsed.activeIssues as ParsedDashboardIssue[];

		return { file, content, issues };
	};

	const rebuildActiveSectionWithSortedBlocks = async (
		dashboard: DashboardConfig,
		sortedIssueBlocks: string[],
		noticeMessage: string
	): Promise<void> => {
		const file = getDashboardFile(dashboard);
		if (file === undefined) {
			return;
		}

		const content = await app.vault.read(file);
		const activeStartIndex = content.indexOf(MARKERS.ACTIVE_START);
		const activeEndIndex = content.indexOf(MARKERS.ACTIVE_END);

		if (activeStartIndex === -1 || activeEndIndex === -1 || activeEndIndex < activeStartIndex) {
			return;
		}

		const activeStart = activeStartIndex + MARKERS.ACTIVE_START.length;
		const beforeActive = content.slice(0, activeStart);
		const afterActive = content.slice(activeEndIndex);
		const cleanedBlocks = sortedIssueBlocks.map((block) => block.trim());
		const newActiveSection =
			'\n' + buildSortBlock(dashboard.id) + cleanedBlocks.join('\n\n') + '\n';

		await app.vault.modify(file, beforeActive + newActiveSection + afterActive);
		new Notice(noticeMessage);
	};

	const readCreatedDateForIssue = async (filePath: string): Promise<number> => {
		const file = app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			return 0;
		}

		const content = await app.vault.read(file);
		const frontmatter = parseYamlFrontmatter(content);
		const createdValue = frontmatter['created'];

		if (!createdValue) {
			return 0;
		}

		const timestamp = new Date(createdValue).getTime();
		return Number.isNaN(timestamp) ? 0 : timestamp;
	};

	const sortByDateField = async (
		dashboard: DashboardConfig,
		direction: SortDirection,
		getTimestamp: (issue: ParsedDashboardIssue) => number | Promise<number>,
		noticeLabel: string
	): Promise<void> => {
		const dashboardData = await getActiveIssueBlocksFromDashboard(dashboard);
		if (dashboardData === undefined) {
			return;
		}

		const { content, issues } = dashboardData;
		if (issues.length < 2) {
			return;
		}

		const timestamps = await Promise.all(
			issues.map((issue) => Promise.resolve(getTimestamp(issue)))
		);
		const issueTimestamps = new Map<string, number>();

		for (const [index, issue] of issues.entries()) {
			issueTimestamps.set(issue.id, timestamps[index]);
		}

		const sortedIssues = [...issues].sort((a, b) => {
			const timeA = issueTimestamps.get(a.id) ?? 0;
			const timeB = issueTimestamps.get(b.id) ?? 0;
			return direction === 'newest' ? timeB - timeA : timeA - timeB;
		});

		const issueIdToBlock = createIssueIdToBlockMap(content, issues);
		const sortedBlocks = sortedIssues
			.map((issue) => issueIdToBlock.get(issue.id))
			.filter((block): block is string => block !== undefined);

		await rebuildActiveSectionWithSortedBlocks(dashboard, sortedBlocks, noticeLabel);
	};

	const addIssueToDashboard = async (dashboard: DashboardConfig, issue: Issue): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		let file = getDashboardFile(dashboard);

		if (file === undefined) {
			const content = initializeDashboardStructure(dashboard.id);
			await app.vault.create(dashboardPath, content);
			file = getDashboardFile(dashboard);

			if (file === undefined) {
				throw new Error(`Failed to create dashboard file at ${dashboardPath}`);
			}
		}

		let content = await app.vault.read(file);
		if (!hasMarkers(content)) {
			content = initializeDashboardStructure(dashboard.id);
		}

		const issueEntry = buildIssueMarkdownBlock(toIssueBlockParams(issue, dashboard));
		const inserted = insertBeforeMarker(content, MARKERS.ACTIVE_END, `${issueEntry}\n`);
		if (inserted === undefined) {
			throw new Error('Dashboard structure is invalid');
		}

		await app.vault.modify(file, inserted);
	};

	const moveIssueToArchive = async (
		dashboard: DashboardConfig,
		issueId: string
	): Promise<void> => {
		await moveIssueBetweenSections(
			dashboard,
			issueId,
			MARKERS.ARCHIVE_END,
			ISSUE_ACTIVE_FOLDER,
			ISSUE_ARCHIVE_FOLDER
		);
	};

	const moveIssueToActive = async (
		dashboard: DashboardConfig,
		issueId: string
	): Promise<void> => {
		await moveIssueBetweenSections(
			dashboard,
			issueId,
			MARKERS.ACTIVE_END,
			ISSUE_ARCHIVE_FOLDER,
			ISSUE_ACTIVE_FOLDER
		);
	};

	const removeIssueFromDashboard = async (
		dashboard: DashboardConfig,
		issueId: string
	): Promise<void> => {
		const file = getDashboardFile(dashboard);
		if (file === undefined) {
			return;
		}

		const content = await app.vault.read(file);
		const result = extractAndRemoveIssueBlock(content, issueId);
		if (result === undefined) {
			return;
		}

		await app.vault.modify(file, result.cleanedContent);
	};

	const moveIssue = async (
		dashboard: DashboardConfig,
		issueId: string,
		direction: 'up' | 'down'
	): Promise<void> => {
		const dashboardData = await getActiveIssueBlocksFromDashboard(dashboard);
		if (dashboardData === undefined) {
			return;
		}

		const { file, content, issues } = dashboardData;
		const issueIndex = issues.findIndex((issue) => issue.id === issueId);
		if (issueIndex === -1) {
			return;
		}

		const swapIndex = direction === 'up' ? issueIndex - 1 : issueIndex + 1;
		if (swapIndex < 0 || swapIndex >= issues.length) {
			return;
		}

		const currentIssue = issues[issueIndex];
		const swapIssue = issues[swapIndex];
		const currentBlock = content.substring(currentIssue.startIndex, currentIssue.endIndex);
		const swapBlock = content.substring(swapIssue.startIndex, swapIssue.endIndex);

		let updatedContent: string;
		if (direction === 'up') {
			updatedContent =
				content.slice(0, swapIssue.startIndex) +
				currentBlock +
				content.slice(swapIssue.endIndex, currentIssue.startIndex) +
				swapBlock +
				content.slice(currentIssue.endIndex);
		} else {
			updatedContent =
				content.slice(0, currentIssue.startIndex) +
				swapBlock +
				content.slice(currentIssue.endIndex, swapIssue.startIndex) +
				currentBlock +
				content.slice(swapIssue.endIndex);
		}

		await app.vault.modify(file, updatedContent);
	};

	const moveIssueToPosition = async (
		dashboard: DashboardConfig,
		issueId: string,
		position: 'top' | 'bottom'
	): Promise<void> => {
		const dashboardData = await getActiveIssueBlocksFromDashboard(dashboard);
		if (dashboardData === undefined) {
			return;
		}

		const { content, issues } = dashboardData;
		if (issues.length < 2) {
			return;
		}

		const issueIndex = issues.findIndex((issue) => issue.id === issueId);
		if (issueIndex === -1) {
			return;
		}

		const isAlreadyAtTarget =
			(position === 'top' && issueIndex === 0) ||
			(position === 'bottom' && issueIndex === issues.length - 1);
		if (isAlreadyAtTarget) {
			return;
		}

		const issueIdToBlock = createIssueIdToBlockMap(content, issues);
		const targetIssue = issues[issueIndex];
		const targetBlock = issueIdToBlock.get(targetIssue.id);
		if (targetBlock === undefined) {
			return;
		}

		const remainingBlocks: string[] = [];
		for (const issue of issues) {
			if (issue.id === issueId) {
				continue;
			}

			const block = issueIdToBlock.get(issue.id);
			if (block !== undefined) {
				remainingBlocks.push(block);
			}
		}

		const sortedBlocks =
			position === 'top'
				? [targetBlock, ...remainingBlocks]
				: [...remainingBlocks, targetBlock];

		await rebuildActiveSectionWithSortedBlocks(
			dashboard,
			sortedBlocks,
			`Issue moved to ${position}`
		);
	};

	const sortByPriority = async (dashboard: DashboardConfig): Promise<void> => {
		const dashboardData = await getActiveIssueBlocksFromDashboard(dashboard);
		if (dashboardData === undefined) {
			return;
		}

		const { content, issues } = dashboardData;
		if (issues.length < 2) {
			return;
		}

		const sortedIssues = [...issues].sort(
			(a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
		);

		const issueIdToBlock = createIssueIdToBlockMap(content, issues);
		const sortedBlocks = sortedIssues
			.map((issue) => issueIdToBlock.get(issue.id))
			.filter((block): block is string => block !== undefined);

		await rebuildActiveSectionWithSortedBlocks(
			dashboard,
			sortedBlocks,
			'Issues sorted by priority'
		);
	};

	const sortByCreatedDate = async (
		dashboard: DashboardConfig,
		direction: SortDirection
	): Promise<void> => {
		const label = direction === 'newest' ? 'newest first' : 'oldest first';

		await sortByDateField(
			dashboard,
			direction,
			(issue) => readCreatedDateForIssue(issue.filePath),
			`Issues sorted by created date (${label})`
		);
	};

	const sortByEditedDate = async (
		dashboard: DashboardConfig,
		direction: SortDirection
	): Promise<void> => {
		const label = direction === 'newest' ? 'recently edited' : 'least recently edited';

		await sortByDateField(
			dashboard,
			direction,
			(issue) => {
				const issueFile = app.vault.getAbstractFileByPath(issue.filePath);
				return issueFile instanceof TFile ? issueFile.stat.mtime : 0;
			},
			`Issues sorted by ${label}`
		);
	};

	const readAndParseIssueFiles = async (files: TFile[]): Promise<ParsedIssueFile[]> => {
		const parsedIssues: ParsedIssueFile[] = [];

		for (const file of files) {
			const content = await app.vault.read(file);
			const parsedIssue = parseIssueFile(file, content);
			if (parsedIssue !== undefined) {
				parsedIssues.push(parsedIssue);
			}
		}

		return parsedIssues;
	};

	const scanIssueFilesForRebuilding = async (
		dashboard: DashboardConfig
	): Promise<{ activeIssues: ParsedIssueFile[]; archivedIssues: ParsedIssueFile[] }> => {
		const activePath = `${dashboard.rootPath}/${ISSUE_SECTION_ROOT}/${ISSUE_ACTIVE_FOLDER}`;
		const archivePath = `${dashboard.rootPath}/${ISSUE_SECTION_ROOT}/${ISSUE_ARCHIVE_FOLDER}`;

		const allFiles = app.vault.getFiles();
		const activeFiles = allFiles.filter(
			(file) => file.path.startsWith(activePath + '/') && file.extension === 'md'
		);
		const archiveFiles = allFiles.filter(
			(file) => file.path.startsWith(archivePath + '/') && file.extension === 'md'
		);

		const activeIssues = await readAndParseIssueFiles(activeFiles);
		const archivedIssues = await readAndParseIssueFiles(archiveFiles);

		activeIssues.sort(sortIssueFilesByPriorityAndCreatedDate);
		archivedIssues.sort(sortIssueFilesByPriorityAndCreatedDate);

		return { activeIssues, archivedIssues };
	};

	const rebuildDashboardFromFiles = async (dashboard: DashboardConfig): Promise<number> => {
		if (dashboard.githubEnabled && plugin.githubService.isAuthenticated()) {
			plugin.githubService.clearCache();
		}

		const { activeIssues, archivedIssues } = await scanIssueFilesForRebuilding(dashboard);
		const dashboardPath = getDashboardPath(dashboard);
		const existingFile = getDashboardFile(dashboard);

		let notesContent = '';
		if (existingFile !== undefined) {
			const existingContent = await app.vault.read(existingFile);
			notesContent = extractNotesSection(existingContent);
		}

		let newContent = `# Active Issues
${MARKERS.ACTIVE_START}
${buildSortBlock(dashboard.id)}`;

		for (const issue of activeIssues) {
			newContent +=
				buildIssueMarkdownBlock(parsedIssueFileToBlockParams(issue, false, dashboard)) +
				'\n';
		}

		const notesSection = notesContent !== '' ? `\n${notesContent}\n\n` : '\n\n';

		newContent += `${MARKERS.ACTIVE_END}
# Notes
${DASHBOARD_NOTES_MARKER}${notesSection}# Archive
${MARKERS.ARCHIVE_START}
`;

		for (const issue of archivedIssues) {
			newContent +=
				buildIssueMarkdownBlock(parsedIssueFileToBlockParams(issue, true, dashboard)) +
				'\n';
		}

		newContent += `${MARKERS.ARCHIVE_END}
# How to Use This Dashboard
- Press "+ Add issue" or keyboard shortcut (set your hotkey in settings)
- Use arrows to reorder issues
- Click archive to archive completed issues
- Click "Sort by Priority" to auto-organize
- Add tasks in issue notes using \`- [ ] Task name\``;

		if (existingFile !== undefined) {
			await app.vault.modify(existingFile, newContent);
		} else {
			await app.vault.create(dashboardPath, newContent);
		}

		const issueCount = activeIssues.length + archivedIssues.length;
		new Notice(`Dashboard rebuilt with ${issueCount} issues`);
		return issueCount;
	};

	return {
		addIssueToDashboard,
		moveIssueToArchive,
		moveIssueToActive,
		removeIssueFromDashboard,
		moveIssue,
		moveIssueToPosition,
		sortByPriority,
		sortByCreatedDate,
		sortByEditedDate,
		rebuildDashboardFromFiles
	};
}

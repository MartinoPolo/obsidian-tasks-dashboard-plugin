import { App, TAbstractFile, TFile, Notice } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, Issue, Priority, IssueStatus, PRIORITY_ORDER } from '../types';
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

	interface IssueBlockParams {
		id: string;
		name: string;
		filePath: string;
		dashboardId: string;
		priority: Priority;
		githubLinks: string[];
		isArchived: boolean;
	}

	const buildIssueMarkdownBlock = (params: IssueBlockParams): string => {
		const relativePath = params.isArchived
			? `Issues/Archive/${params.id}`
			: `Issues/Active/${params.id}`;
		const githubLines = params.githubLinks.map((url) => `github_link: ${url}\n`).join('');
		return `%% ISSUE:${params.id}:START %%
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
%% ISSUE:${params.id}:END %%`;
	};

	const issueToBlockParams = (issue: Issue, dashboard: DashboardConfig): IssueBlockParams => {
		const links = issue.githubLinks ?? [];
		// Backward compat: fall back to single githubLink if githubLinks not set
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

	const extractAndRemoveIssueBlock = (
		content: string,
		issueId: string
	): { block: string; cleanedContent: string } | undefined => {
		const issueStartMarker = `%% ISSUE:${issueId}:START %%`;
		const issueEndMarker = `%% ISSUE:${issueId}:END %%`;
		const startIndex = content.indexOf(issueStartMarker);
		const endIndex = content.indexOf(issueEndMarker);

		if (startIndex === -1 || endIndex === -1) {
			return undefined;
		}

		const block = content.substring(startIndex, endIndex + issueEndMarker.length);
		let cleanedContent = content.slice(0, startIndex) + content.slice(endIndex + issueEndMarker.length);

		// Remove trailing separator if present right after where the block was
		const separatorAfter = cleanedContent.indexOf('---\n', startIndex);
		if (separatorAfter !== -1 && separatorAfter < startIndex + 10) {
			cleanedContent = cleanedContent.slice(0, startIndex) + cleanedContent.slice(separatorAfter + 4);
		}

		return { block, cleanedContent };
	};

	const addIssueToDashboard = async (dashboard: DashboardConfig, issue: Issue): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		let file = resolveFileByPath(dashboardPath);

		if (file === undefined) {
			const content = initializeDashboardStructure(dashboard.id);
			await app.vault.create(dashboardPath, content);
			file = resolveFileByPath(dashboardPath);
			if (file === undefined) {
				throw new Error(`Failed to create dashboard file at ${dashboardPath}`);
			}
		}

		let content = await app.vault.read(file);

		if (!hasMarkers(content)) {
			content = initializeDashboardStructure(dashboard.id);
		}

		const issueEntry = buildIssueMarkdownBlock(issueToBlockParams(issue, dashboard));
		const activeEndMarker = MARKERS.ACTIVE_END;
		const insertIndex = content.indexOf(activeEndMarker);

		if (insertIndex === -1) {
			throw new Error('Dashboard structure is invalid');
		}

		content = content.slice(0, insertIndex) + issueEntry + '\n' + content.slice(insertIndex);
		await app.vault.modify(file, content);
	};

	const moveIssueToArchive = async (dashboard: DashboardConfig, issueId: string): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = resolveFileByPath(dashboardPath);

		if (file === undefined) {
			return;
		}

		const content = await app.vault.read(file);
		const result = extractAndRemoveIssueBlock(content, issueId);

		if (result === undefined) {
			return;
		}

		let cleanedContent = result.cleanedContent;
		const archiveInsertIndex = cleanedContent.indexOf(MARKERS.ARCHIVE_END);

		if (archiveInsertIndex !== -1) {
			const updatedBlock = result.block.replace(/Issues\/Active/g, 'Issues/Archive');
			cleanedContent =
				cleanedContent.slice(0, archiveInsertIndex) +
				updatedBlock +
				'\n---\n' +
				cleanedContent.slice(archiveInsertIndex);
		}

		await app.vault.modify(file, cleanedContent);
	};

	const moveIssueToActive = async (dashboard: DashboardConfig, issueId: string): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = resolveFileByPath(dashboardPath);

		if (file === undefined) {
			return;
		}

		const content = await app.vault.read(file);
		const result = extractAndRemoveIssueBlock(content, issueId);

		if (result === undefined) {
			return;
		}

		let cleanedContent = result.cleanedContent;
		const activeInsertIndex = cleanedContent.indexOf(MARKERS.ACTIVE_END);

		if (activeInsertIndex !== -1) {
			const updatedBlock = result.block.replace(/Issues\/Archive/g, 'Issues/Active');
			cleanedContent =
				cleanedContent.slice(0, activeInsertIndex) +
				updatedBlock +
				'\n---\n' +
				cleanedContent.slice(activeInsertIndex);
		}

		await app.vault.modify(file, cleanedContent);
	};

	const removeIssueFromDashboard = async (
		dashboard: DashboardConfig,
		issueId: string
	): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = resolveFileByPath(dashboardPath);

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
		const dashboardPath = getDashboardPath(dashboard);
		const file = resolveFileByPath(dashboardPath);

		if (file === undefined) {
			return;
		}

		let content = await app.vault.read(file);
		const parsed = parseDashboard(content);
		const issueIndex = parsed.activeIssues.findIndex((i) => i.id === issueId);

		if (issueIndex === -1) {
			return;
		}

		const swapIndex = direction === 'up' ? issueIndex - 1 : issueIndex + 1;

		if (swapIndex < 0 || swapIndex >= parsed.activeIssues.length) {
			return;
		}

		const currentIssue = parsed.activeIssues[issueIndex];
		const swapIssue = parsed.activeIssues[swapIndex];
		const currentBlock = content.substring(currentIssue.startIndex, currentIssue.endIndex);
		const swapBlock = content.substring(swapIssue.startIndex, swapIssue.endIndex);

		if (direction === 'up') {
			content =
				content.slice(0, swapIssue.startIndex) +
				currentBlock +
				content.slice(swapIssue.endIndex, currentIssue.startIndex) +
				swapBlock +
				content.slice(currentIssue.endIndex);
		} else {
			content =
				content.slice(0, currentIssue.startIndex) +
				swapBlock +
				content.slice(currentIssue.endIndex, swapIssue.startIndex) +
				currentBlock +
				content.slice(swapIssue.endIndex);
		}

		await app.vault.modify(file, content);
	};

	const moveIssueToPosition = async (
		dashboard: DashboardConfig,
		issueId: string,
		position: 'top' | 'bottom'
	): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = resolveFileByPath(dashboardPath);

		if (file === undefined) {
			return;
		}

		const content = await app.vault.read(file);
		const parsed = parseDashboard(content);
		const issueIndex = parsed.activeIssues.findIndex((i) => i.id === issueId);

		if (issueIndex === -1) {
			return;
		}

		if (parsed.activeIssues.length < 2) {
			return;
		}

		const isAlreadyAtPosition =
			(position === 'top' && issueIndex === 0) ||
			(position === 'bottom' && issueIndex === parsed.activeIssues.length - 1);

		if (isAlreadyAtPosition) {
			return;
		}

		const blocks: string[] = [];
		for (const issue of parsed.activeIssues) {
			blocks.push(content.substring(issue.startIndex, issue.endIndex));
		}

		const targetBlock = blocks[issueIndex];
		const remainingBlocks = [...blocks.slice(0, issueIndex), ...blocks.slice(issueIndex + 1)];

		const sortedBlocks =
			position === 'top' ? [targetBlock, ...remainingBlocks] : [...remainingBlocks, targetBlock];

		await rebuildActiveSectionWithSortedBlocks(
			dashboard,
			sortedBlocks,
			`Issue moved to ${position}`
		);
	};

	const sortByPriority = async (dashboard: DashboardConfig): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = resolveFileByPath(dashboardPath);

		if (file === undefined) {
			return;
		}

		const content = await app.vault.read(file);
		const parsed = parseDashboard(content);

		if (parsed.activeIssues.length < 2) {
			return;
		}

		const sortedIssues = [...parsed.activeIssues].sort(
			(a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
		);

		const blocks: string[] = [];
		for (const issue of parsed.activeIssues) {
			blocks.push(content.substring(issue.startIndex, issue.endIndex));
		}

		const sortedBlocks = sortedIssues.map((issue) => {
			const originalIndex = parsed.activeIssues.findIndex((i) => i.id === issue.id);
			return blocks[originalIndex];
		});

		await rebuildActiveSectionWithSortedBlocks(dashboard, sortedBlocks, 'Issues sorted by priority');
	};

	const rebuildActiveSectionWithSortedBlocks = async (
		dashboard: DashboardConfig,
		sortedIssueBlocks: string[],
		noticeMessage: string
	): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = resolveFileByPath(dashboardPath);

		if (file === undefined) {
			return;
		}

		let content = await app.vault.read(file);
		const activeStartMarker = MARKERS.ACTIVE_START;
		const activeEndMarker = MARKERS.ACTIVE_END;
		const activeStart = content.indexOf(activeStartMarker) + activeStartMarker.length;
		const activeEnd = content.indexOf(activeEndMarker);

		const beforeActive = content.slice(0, activeStart);
		const afterActive = content.slice(activeEnd);
		const sortBlock = '```tasks-dashboard-sort\ndashboard: ' + dashboard.id + '\n```\n';
		const cleanedBlocks = sortedIssueBlocks.map((block) => block.trim());
		const newActiveSection = '\n' + sortBlock + cleanedBlocks.join('\n\n') + '\n';

		content = beforeActive + newActiveSection + afterActive;
		await app.vault.modify(file, content);
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
		return isNaN(timestamp) ? 0 : timestamp;
	};

	const sortByDateField = async (
		dashboard: DashboardConfig,
		direction: SortDirection,
		getTimestamp: (issue: { id: string; filePath: string }) => Promise<number>,
		noticeLabel: string
	): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = resolveFileByPath(dashboardPath);

		if (file === undefined) {
			return;
		}

		const content = await app.vault.read(file);
		const parsed = parseDashboard(content);

		if (parsed.activeIssues.length < 2) {
			return;
		}

		const timestamps = await Promise.all(
			parsed.activeIssues.map((issue) => getTimestamp(issue))
		);
		const issueTimestamps = new Map<string, number>();
		for (const [index, issue] of parsed.activeIssues.entries()) {
			issueTimestamps.set(issue.id, timestamps[index]);
		}

		const sortedIssues = [...parsed.activeIssues].sort((a, b) => {
			const timeA = issueTimestamps.get(a.id) ?? 0;
			const timeB = issueTimestamps.get(b.id) ?? 0;
			return direction === 'newest' ? timeB - timeA : timeA - timeB;
		});

		const blocks: string[] = [];
		for (const issue of parsed.activeIssues) {
			blocks.push(content.substring(issue.startIndex, issue.endIndex));
		}

		const sortedBlocks = sortedIssues.map((issue) => {
			const originalIndex = parsed.activeIssues.findIndex((i) => i.id === issue.id);
			return blocks[originalIndex];
		});

		await rebuildActiveSectionWithSortedBlocks(dashboard, sortedBlocks, noticeLabel);
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
			async (issue) => {
				const issueFile = app.vault.getAbstractFileByPath(issue.filePath);
				return issueFile instanceof TFile ? issueFile.stat.mtime : 0;
			},
			`Issues sorted by ${label}`
		);
	};

	interface ParsedIssueFile {
		id: string;
		name: string;
		priority: Priority;
		status: IssueStatus;
		created: string;
		filePath: string;
		githubLinks: string[];
	}

	const FORBIDDEN_PROTO_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

	const parseYamlFrontmatter = (content: string): Record<string, string> => {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (frontmatterMatch === null) {
			return {};
		}

		const result: Record<string, string> = Object.create(null) as Record<string, string>;
		const lines = frontmatterMatch[1].split('\n');

		for (const line of lines) {
			const colonIndex = line.indexOf(':');
			if (colonIndex !== -1) {
				const key = line.substring(0, colonIndex).trim();
				if (FORBIDDEN_PROTO_KEYS.has(key)) {
					continue;
				}
				const value = line.substring(colonIndex + 1).trim();
				result[key] = value;
			}
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

		// New format: github_links: array with `- url:` entries
		const githubLinksUrls: string[] = [];
		const urlEntryPattern = /^\s+-\s*url:\s*"?([^"\n]+)"?/gm;
		const hasGithubLinks = frontmatterText.includes('github_links:');
		if (hasGithubLinks) {
			let urlMatch;
			while ((urlMatch = urlEntryPattern.exec(frontmatterText)) !== null) {
				githubLinksUrls.push(urlMatch[1].trim());
			}
			if (githubLinksUrls.length > 0) {
				return githubLinksUrls;
			}
		}

		// Old format: single github: block with nested url:
		const oldGithubMatch = frontmatterText.match(/^github:\s*\n((?:\s+\w+:.*\n?)*)/m);
		if (oldGithubMatch !== null) {
			const oldUrlMatch = oldGithubMatch[0].match(/url:\s*"?([^"\n]+)"?/);
			if (oldUrlMatch !== null) {
				return [oldUrlMatch[1].trim()];
			}
		}

		return [];
	};

	const parseIssueFile = (file: TFile, content: string): ParsedIssueFile | undefined => {
		const frontmatter = parseYamlFrontmatter(content);
		const name = extractIssueName(content);

		if (name === undefined) {
			return undefined;
		}

		const priorityValue = frontmatter['priority'];
		const statusValue = frontmatter['status'];
		const priority: Priority =
			priorityValue === 'low' ||
			priorityValue === 'medium' ||
			priorityValue === 'high' ||
			priorityValue === 'top'
				? priorityValue
				: 'medium';
		const status: IssueStatus =
			statusValue === 'active' || statusValue === 'archived' ? statusValue : 'active';
		const created = frontmatter['created'] || new Date().toISOString();
		const githubLinks = extractGithubLinksFromFrontmatter(content);

		return {
			id: file.basename,
			name,
			priority,
			status,
			created,
			filePath: file.path,
			githubLinks
		};
	};

	const parsedIssueFileToBlockParams = (
		issueFile: ParsedIssueFile,
		isArchived: boolean,
		dashboard: DashboardConfig
	): IssueBlockParams => ({
		id: issueFile.id,
		name: issueFile.name,
		filePath: issueFile.filePath,
		dashboardId: dashboard.id,
		priority: issueFile.priority,
		githubLinks: issueFile.githubLinks,
		isArchived
	});

	const extractNotesSection = (existingContent: string): string => {
		const notesMarker = '%% TASKS-DASHBOARD:NOTES %%';
		const notesHeader = '# Notes';
		const archiveHeader = '# Archive';

		const notesMarkerIndex = existingContent.indexOf(notesMarker);
		const notesHeaderIndex = existingContent.indexOf(notesHeader);
		const archiveIndex = existingContent.indexOf(archiveHeader);

		if (archiveIndex === -1) {
			return '';
		}

		let startIndex = -1;

		// Prefer marker-based extraction if marker exists
		if (notesMarkerIndex !== -1 && notesMarkerIndex < archiveIndex) {
			startIndex = notesMarkerIndex + notesMarker.length;
		} else if (notesHeaderIndex !== -1 && notesHeaderIndex < archiveIndex) {
			// Fall back to header-based extraction
			startIndex = notesHeaderIndex + notesHeader.length;
		}

		if (startIndex === -1) {
			return '';
		}

		const rawContent = existingContent.substring(startIndex, archiveIndex);
		// Remove leading marker if present (when using header-based extraction)
		const cleanedContent = rawContent.replace(/^\s*%% TASKS-DASHBOARD:NOTES %%\s*/, '');
		return cleanedContent.trim();
	};

	const scanIssueFilesForRebuilding = async (
		dashboard: DashboardConfig
	): Promise<{ activeIssues: ParsedIssueFile[]; archivedIssues: ParsedIssueFile[] }> => {
		const activePath = `${dashboard.rootPath}/Issues/Active`;
		const archivePath = `${dashboard.rootPath}/Issues/Archive`;

		const allFiles = app.vault.getFiles();
		const activeFiles = allFiles.filter(
			(f) => f.path.startsWith(activePath + '/') && f.extension === 'md'
		);
		const archiveFiles = allFiles.filter(
			(f) => f.path.startsWith(archivePath + '/') && f.extension === 'md'
		);

		const activeIssues: ParsedIssueFile[] = [];
		for (const file of activeFiles) {
			const content = await app.vault.read(file);
			const parsed = parseIssueFile(file, content);
			if (parsed !== undefined) {
				activeIssues.push(parsed);
			}
		}

		const archivedIssues: ParsedIssueFile[] = [];
		for (const file of archiveFiles) {
			const content = await app.vault.read(file);
			const parsed = parseIssueFile(file, content);
			if (parsed !== undefined) {
				archivedIssues.push(parsed);
			}
		}

		const sortByCreatedAndPriority = (a: ParsedIssueFile, b: ParsedIssueFile): number => {
			const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
			if (priorityDiff !== 0) {
				return priorityDiff;
			}
			return new Date(b.created).getTime() - new Date(a.created).getTime();
		};

		activeIssues.sort(sortByCreatedAndPriority);
		archivedIssues.sort(sortByCreatedAndPriority);

		return { activeIssues, archivedIssues };
	};

	const rebuildDashboardFromFiles = async (dashboard: DashboardConfig): Promise<number> => {
		// Clear GitHub cache so cards re-fetch fresh data after rebuild
		if (dashboard.githubEnabled && plugin.githubService.isAuthenticated()) {
			plugin.githubService.clearCache();
		}

		const { activeIssues, archivedIssues } = await scanIssueFilesForRebuilding(dashboard);

		let notesContent = '';
		const dashboardPath = getDashboardPath(dashboard);
		const existingFile = resolveFileByPath(dashboardPath);

		if (existingFile !== undefined) {
			const existingContent = await app.vault.read(existingFile);
			notesContent = extractNotesSection(existingContent);
		}

		let newContent = `# Active Issues
${MARKERS.ACTIVE_START}
\`\`\`tasks-dashboard-sort
dashboard: ${dashboard.id}
\`\`\`
`;

		for (const issue of activeIssues) {
			newContent += buildIssueMarkdownBlock(parsedIssueFileToBlockParams(issue, false, dashboard)) + '\n';
		}

		// Build Notes section with proper formatting
		const notesSection = notesContent !== '' ? `\n${notesContent}\n\n` : '\n\n';

		newContent += `${MARKERS.ACTIVE_END}
# Notes
%% TASKS-DASHBOARD:NOTES %%${notesSection}# Archive
${MARKERS.ARCHIVE_START}
`;

		for (const issue of archivedIssues) {
			newContent += buildIssueMarkdownBlock(parsedIssueFileToBlockParams(issue, true, dashboard)) + '\n';
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

		new Notice(`Dashboard rebuilt with ${activeIssues.length + archivedIssues.length} issues`);
		return activeIssues.length + archivedIssues.length;
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

import { App, TFile, Notice } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, Issue, Priority, IssueStatus, PRIORITY_ORDER } from '../types';
import {
	parseDashboard,
	hasMarkers,
	initializeDashboardStructure,
	MARKERS
} from './DashboardParser';

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
	sortByPriority: (dashboard: DashboardConfig) => Promise<void>;
	sortByCreatedDate: (dashboard: DashboardConfig, direction: SortDirection) => Promise<void>;
	sortByEditedDate: (dashboard: DashboardConfig, direction: SortDirection) => Promise<void>;
	rebuildDashboardFromFiles: (dashboard: DashboardConfig) => Promise<number>;
}

const getDashboardPath = (dashboard: DashboardConfig): string => {
	const filename = dashboard.dashboardFilename || 'Dashboard.md';
	return `${dashboard.rootPath}/${filename}`;
};

export function createDashboardWriter(
	app: App,
	_plugin: TasksDashboardPlugin
): DashboardWriterInstance {
	const buildIssueEntry = (issue: Issue, dashboard: DashboardConfig): string => {
		const relativePath = `Issues/Active/${issue.id}`;
		const githubLine =
			issue.githubLink !== undefined && issue.githubLink !== ''
				? `github: ${issue.githubLink}\n`
				: '';
		return `%% ISSUE:${issue.id}:START %%
\`\`\`tasks-dashboard-controls
issue: ${issue.id}
name: ${issue.name}
path: ${issue.filePath}
dashboard: ${dashboard.id}
priority: ${issue.priority}
${githubLine}\`\`\`
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
%% ISSUE:${issue.id}:END %%`;
	};

	const addIssueToDashboard = async (dashboard: DashboardConfig, issue: Issue): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		let file = app.vault.getAbstractFileByPath(dashboardPath) as TFile | null;

		if (file === null) {
			const content = initializeDashboardStructure(dashboard.id);
			await app.vault.create(dashboardPath, content);
			file = app.vault.getAbstractFileByPath(dashboardPath) as TFile;
		}

		let content = await app.vault.read(file);

		if (!hasMarkers(content)) {
			content = initializeDashboardStructure(dashboard.id);
		}

		const issueEntry = buildIssueEntry(issue, dashboard);
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
		const file = app.vault.getAbstractFileByPath(dashboardPath) as TFile | null;

		if (file === null) {
			return;
		}

		let content = await app.vault.read(file);
		const issueStartMarker = `%% ISSUE:${issueId}:START %%`;
		const issueEndMarker = `%% ISSUE:${issueId}:END %%`;
		const startIndex = content.indexOf(issueStartMarker);
		const endIndex = content.indexOf(issueEndMarker);

		if (startIndex === -1 || endIndex === -1) {
			return;
		}

		const issueBlock = content.substring(startIndex, endIndex + issueEndMarker.length);
		content = content.slice(0, startIndex) + content.slice(endIndex + issueEndMarker.length);

		const separatorAfter = content.indexOf('---\n', startIndex);
		if (separatorAfter !== -1 && separatorAfter < startIndex + 10) {
			content = content.slice(0, startIndex) + content.slice(separatorAfter + 4);
		}

		const archiveEnd = MARKERS.ARCHIVE_END;
		const archiveInsertIndex = content.indexOf(archiveEnd);

		if (archiveInsertIndex !== -1) {
			const updatedBlock = issueBlock.replace(/Issues\/Active/g, 'Issues/Archive');
			content =
				content.slice(0, archiveInsertIndex) +
				updatedBlock +
				'\n---\n' +
				content.slice(archiveInsertIndex);
		}

		await app.vault.modify(file, content);
	};

	const moveIssueToActive = async (dashboard: DashboardConfig, issueId: string): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = app.vault.getAbstractFileByPath(dashboardPath) as TFile | null;

		if (file === null) {
			return;
		}

		let content = await app.vault.read(file);
		const issueStartMarker = `%% ISSUE:${issueId}:START %%`;
		const issueEndMarker = `%% ISSUE:${issueId}:END %%`;
		const startIndex = content.indexOf(issueStartMarker);
		const endIndex = content.indexOf(issueEndMarker);

		if (startIndex === -1 || endIndex === -1) {
			return;
		}

		const issueBlock = content.substring(startIndex, endIndex + issueEndMarker.length);
		content = content.slice(0, startIndex) + content.slice(endIndex + issueEndMarker.length);

		const separatorAfter = content.indexOf('---\n', startIndex);
		if (separatorAfter !== -1 && separatorAfter < startIndex + 10) {
			content = content.slice(0, startIndex) + content.slice(separatorAfter + 4);
		}

		const activeEnd = MARKERS.ACTIVE_END;
		const activeInsertIndex = content.indexOf(activeEnd);

		if (activeInsertIndex !== -1) {
			const updatedBlock = issueBlock.replace(/Issues\/Archive/g, 'Issues/Active');
			content =
				content.slice(0, activeInsertIndex) +
				updatedBlock +
				'\n---\n' +
				content.slice(activeInsertIndex);
		}

		await app.vault.modify(file, content);
	};

	const removeIssueFromDashboard = async (
		dashboard: DashboardConfig,
		issueId: string
	): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = app.vault.getAbstractFileByPath(dashboardPath) as TFile | null;

		if (file === null) {
			return;
		}

		let content = await app.vault.read(file);
		const issueStartMarker = `%% ISSUE:${issueId}:START %%`;
		const issueEndMarker = `%% ISSUE:${issueId}:END %%`;
		const startIndex = content.indexOf(issueStartMarker);
		const endIndex = content.indexOf(issueEndMarker);

		if (startIndex === -1 || endIndex === -1) {
			return;
		}

		content = content.slice(0, startIndex) + content.slice(endIndex + issueEndMarker.length);

		// Remove trailing separator if present right after where the block was
		const separatorAfter = content.indexOf('---\n', startIndex);
		if (separatorAfter !== -1 && separatorAfter < startIndex + 10) {
			content = content.slice(0, startIndex) + content.slice(separatorAfter + 4);
		}

		await app.vault.modify(file, content);
	};

	const moveIssue = async (
		dashboard: DashboardConfig,
		issueId: string,
		direction: 'up' | 'down'
	): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = app.vault.getAbstractFileByPath(dashboardPath) as TFile | null;

		if (file === null) {
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

	const sortByPriority = async (dashboard: DashboardConfig): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = app.vault.getAbstractFileByPath(dashboardPath) as TFile | null;

		if (file === null) {
			return;
		}

		let content = await app.vault.read(file);
		const parsed = parseDashboard(content);

		if (parsed.activeIssues.length < 2) {
			return;
		}

		const sortedIssues = [...parsed.activeIssues].sort(
			(a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
		);

		const blocks: string[] = [];
		for (const issue of parsed.activeIssues) {
			const block = content.substring(issue.startIndex, issue.endIndex);
			blocks.push(block);
		}

		const sortedBlocks = sortedIssues.map((issue) => {
			const originalIndex = parsed.activeIssues.findIndex((i) => i.id === issue.id);
			return blocks[originalIndex];
		});

		const activeStartMarker = MARKERS.ACTIVE_START;
		const activeEndMarker = MARKERS.ACTIVE_END;
		const activeStart = content.indexOf(activeStartMarker) + activeStartMarker.length;
		const activeEnd = content.indexOf(activeEndMarker);

		const beforeActive = content.slice(0, activeStart);
		const afterActive = content.slice(activeEnd);
		const sortBlock = '```tasks-dashboard-sort\ndashboard: ' + dashboard.id + '\n```\n';
		const cleanedBlocks = sortedBlocks.map((block) => block.trim());
		const newActiveSection = '\n' + sortBlock + cleanedBlocks.join('\n\n') + '\n';

		content = beforeActive + newActiveSection + afterActive;
		await app.vault.modify(file, content);
		new Notice('Issues sorted by priority');
	};

	const rebuildActiveSectionWithSortedBlocks = async (
		dashboard: DashboardConfig,
		sortedIssueBlocks: string[],
		noticeMessage: string
	): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = app.vault.getAbstractFileByPath(dashboardPath) as TFile | null;

		if (file === null) {
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

	const sortByCreatedDate = async (
		dashboard: DashboardConfig,
		direction: SortDirection
	): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = app.vault.getAbstractFileByPath(dashboardPath) as TFile | null;

		if (file === null) {
			return;
		}

		const content = await app.vault.read(file);
		const parsed = parseDashboard(content);

		if (parsed.activeIssues.length < 2) {
			return;
		}

		const issueTimestamps = new Map<string, number>();
		for (const issue of parsed.activeIssues) {
			const createdTimestamp = await readCreatedDateForIssue(issue.filePath);
			issueTimestamps.set(issue.id, createdTimestamp);
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

		const label = direction === 'newest' ? 'newest first' : 'oldest first';
		await rebuildActiveSectionWithSortedBlocks(
			dashboard,
			sortedBlocks,
			`Issues sorted by created date (${label})`
		);
	};

	const sortByEditedDate = async (
		dashboard: DashboardConfig,
		direction: SortDirection
	): Promise<void> => {
		const dashboardPath = getDashboardPath(dashboard);
		const file = app.vault.getAbstractFileByPath(dashboardPath) as TFile | null;

		if (file === null) {
			return;
		}

		const content = await app.vault.read(file);
		const parsed = parseDashboard(content);

		if (parsed.activeIssues.length < 2) {
			return;
		}

		const issueModifiedTimes = new Map<string, number>();
		for (const issue of parsed.activeIssues) {
			const issueFile = app.vault.getAbstractFileByPath(issue.filePath);
			const modifiedTime = issueFile instanceof TFile ? issueFile.stat.mtime : 0;
			issueModifiedTimes.set(issue.id, modifiedTime);
		}

		const sortedIssues = [...parsed.activeIssues].sort((a, b) => {
			const timeA = issueModifiedTimes.get(a.id) ?? 0;
			const timeB = issueModifiedTimes.get(b.id) ?? 0;
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

		const label = direction === 'newest' ? 'recently edited' : 'least recently edited';
		await rebuildActiveSectionWithSortedBlocks(
			dashboard,
			sortedBlocks,
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
	}

	const parseYamlFrontmatter = (content: string): Record<string, string> => {
		const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
		if (frontmatterMatch === null) {
			return {};
		}

		const result: Record<string, string> = {};
		const lines = frontmatterMatch[1].split('\n');

		for (const line of lines) {
			const colonIndex = line.indexOf(':');
			if (colonIndex !== -1) {
				const key = line.substring(0, colonIndex).trim();
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

		return {
			id: file.basename,
			name,
			priority,
			status,
			created,
			filePath: file.path
		};
	};

	const buildIssueBlock = (
		issueFile: ParsedIssueFile,
		isArchived: boolean,
		dashboard: DashboardConfig
	): string => {
		const relativePath = isArchived
			? `Issues/Archive/${issueFile.id}`
			: `Issues/Active/${issueFile.id}`;
		return `%% ISSUE:${issueFile.id}:START %%
\`\`\`tasks-dashboard-controls
issue: ${issueFile.id}
name: ${issueFile.name}
path: ${issueFile.filePath}
dashboard: ${dashboard.id}
priority: ${issueFile.priority}
\`\`\`
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
%% ISSUE:${issueFile.id}:END %%`;
	};

	const rebuildDashboardFromFiles = async (dashboard: DashboardConfig): Promise<number> => {
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

		let notesContent = '';
		const dashboardPath = getDashboardPath(dashboard);
		const existingFile = app.vault.getAbstractFileByPath(dashboardPath) as TFile | null;

		if (existingFile !== null) {
			const existingContent = await app.vault.read(existingFile);

			// Try multiple extraction strategies for Notes content
			const notesMarker = '%% TASKS-DASHBOARD:NOTES %%';
			const notesHeader = '# Notes';
			const archiveHeader = '# Archive';

			const notesMarkerIndex = existingContent.indexOf(notesMarker);
			const notesHeaderIndex = existingContent.indexOf(notesHeader);
			const archiveIndex = existingContent.indexOf(archiveHeader);

			if (archiveIndex !== -1) {
				let startIndex = -1;

				// Prefer marker-based extraction if marker exists
				if (notesMarkerIndex !== -1 && notesMarkerIndex < archiveIndex) {
					startIndex = notesMarkerIndex + notesMarker.length;
				} else if (notesHeaderIndex !== -1 && notesHeaderIndex < archiveIndex) {
					// Fall back to header-based extraction
					startIndex = notesHeaderIndex + notesHeader.length;
				}

				if (startIndex !== -1) {
					const rawContent = existingContent.substring(startIndex, archiveIndex);
					// Remove leading marker if present (when using header-based extraction)
					const cleanedContent = rawContent.replace(/^\s*%% TASKS-DASHBOARD:NOTES %%\s*/, '');
					// Preserve internal whitespace but trim edges
					notesContent = cleanedContent.trim();
				}
			}
		}

		let newContent = `# Active Issues
${MARKERS.ACTIVE_START}
\`\`\`tasks-dashboard-sort
dashboard: ${dashboard.id}
\`\`\`
`;

		for (const issue of activeIssues) {
			newContent += buildIssueBlock(issue, false, dashboard) + '\n';
		}

		// Build Notes section with proper formatting
		const notesSection = notesContent !== '' ? `\n${notesContent}\n\n` : '\n\n';

		newContent += `${MARKERS.ACTIVE_END}
# Notes
%% TASKS-DASHBOARD:NOTES %%${notesSection}# Archive
${MARKERS.ARCHIVE_START}
`;

		for (const issue of archivedIssues) {
			newContent += buildIssueBlock(issue, true, dashboard) + '\n';
		}

		newContent += `${MARKERS.ARCHIVE_END}
# How to Use This Dashboard
- Press "+ Add issue" or keyboard shortcut (set your hotkey in settings)
- Use arrows to reorder issues
- Click archive to archive completed issues
- Click "Sort by Priority" to auto-organize
- Add tasks in issue notes using \`- [ ] Task name\``;

		if (existingFile !== null) {
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
		sortByPriority,
		sortByCreatedDate,
		sortByEditedDate,
		rebuildDashboardFromFiles
	};
}

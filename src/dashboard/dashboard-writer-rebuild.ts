import { App, TFile } from 'obsidian';
import { DashboardConfig } from '../types';
import { MARKERS } from './DashboardParser';
import { DASHBOARD_NOTES_MARKER } from './dashboard-markers';
import {
	ISSUE_ACTIVE_FOLDER,
	ISSUE_ARCHIVE_FOLDER,
	ISSUE_SECTION_ROOT
} from './dashboard-writer-constants';
import {
	buildIssueMarkdownBlock,
	buildSortBlock,
	parseIssueFile,
	parsedIssueFileToBlockParams,
	sortIssueFilesByPriorityAndCreatedDate
} from './dashboard-writer-helpers';
import { ParsedIssueFile } from './dashboard-writer-types';

export const readAndParseIssueFiles = async (app: App, files: TFile[]): Promise<ParsedIssueFile[]> => {
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

export const scanIssueFilesForRebuilding = async (
	app: App,
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

	const activeIssues = await readAndParseIssueFiles(app, activeFiles);
	const archivedIssues = await readAndParseIssueFiles(app, archiveFiles);

	activeIssues.sort(sortIssueFilesByPriorityAndCreatedDate);
	archivedIssues.sort(sortIssueFilesByPriorityAndCreatedDate);

	return { activeIssues, archivedIssues };
};

export const buildRebuiltDashboardContent = (
	dashboard: DashboardConfig,
	activeIssues: ParsedIssueFile[],
	archivedIssues: ParsedIssueFile[],
	notesContent: string
): string => {
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

	return newContent;
};

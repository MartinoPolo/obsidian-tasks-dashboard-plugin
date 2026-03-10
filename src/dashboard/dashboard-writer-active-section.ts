import { App, Notice, TFile } from 'obsidian';
import { DashboardConfig } from '../types';
import { MARKERS, parseDashboard } from './DashboardParser';
import { createIssueIdToBlockMap, removeLegacyIssueSeparator } from './dashboard-writer-helpers';
import { ParsedDashboardIssue, SortDirection } from './dashboard-writer-types';

export interface ActiveDashboardData {
	file: TFile;
	content: string;
	issues: ParsedDashboardIssue[];
}

export const getActiveIssueBlocksFromDashboard = async (
	app: App,
	dashboard: DashboardConfig,
	getDashboardFile: (dashboard: DashboardConfig) => TFile | undefined
): Promise<ActiveDashboardData | undefined> => {
	const file = getDashboardFile(dashboard);
	if (file === undefined) {
		return undefined;
	}

	const content = await app.vault.read(file);
	const parsed = parseDashboard(content);
	const issues = parsed.activeIssues as ParsedDashboardIssue[];

	return { file, content, issues };
};

export const rebuildActiveSectionWithSortedBlocks = async (
	app: App,
	dashboard: DashboardConfig,
	getDashboardFile: (dashboard: DashboardConfig) => TFile | undefined,
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
	const cleanedBlocks = sortedIssueBlocks.map((block) =>
		removeLegacyIssueSeparator(block).trim()
	);
	const blocksSection = cleanedBlocks.length > 0 ? `${cleanedBlocks.join('\n')}\n` : '';
	const newActiveSection = `\n${blocksSection}`;

	await app.vault.modify(file, beforeActive + newActiveSection + afterActive);
	new Notice(noticeMessage);
};

const WORKTREE_ORIGIN_FOLDER_PATTERN = /worktree_origin_folder:\s*(.+)/;
const NO_WORKTREE_FOLDER_SENTINEL = '\uffff';

export const extractWorktreeOriginFolderFromBlock = (block: string): string => {
	const match = block.match(WORKTREE_ORIGIN_FOLDER_PATTERN);
	if (match === null) {
		return NO_WORKTREE_FOLDER_SENTINEL;
	}
	return match[1].trim();
};

const WORKTREE_BRANCH_PATTERN = /worktree_branch:\s*(.+)/;
const GITHUB_LINK_EXTRACT_PATTERN = /github_link:\s*(\S+)/g;

export const extractBranchFromBlock = (block: string): string | undefined => {
	const match = block.match(WORKTREE_BRANCH_PATTERN);
	if (match === null) {
		return undefined;
	}
	return match[1].trim();
};

export const extractGithubLinksFromBlock = (block: string): string[] => {
	const links: string[] = [];
	let match: RegExpExecArray | null;
	const pattern = new RegExp(GITHUB_LINK_EXTRACT_PATTERN.source, 'g');
	while ((match = pattern.exec(block)) !== null) {
		links.push(match[1]);
	}
	return links;
};

export const sortByDateField = async (
	dashboardData: ActiveDashboardData,
	direction: SortDirection,
	getTimestamp: (issue: ParsedDashboardIssue) => number | Promise<number>
): Promise<string[]> => {
	const { content, issues } = dashboardData;
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
	return sortedIssues
		.map((issue) => issueIdToBlock.get(issue.id))
		.filter((block): block is string => block !== undefined);
};

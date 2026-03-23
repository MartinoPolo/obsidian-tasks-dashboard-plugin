import { App, TFile } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, PRIORITY_ORDER } from '../types';
import {
	extractBranchFromBlock,
	extractGithubLinksFromBlock,
	extractWorktreeOriginFolderFromBlock,
	getActiveIssueBlocksFromDashboard,
	sortByDateField as getSortedBlocksByDateField,
	rebuildActiveSectionWithSortedBlocks
} from './dashboard-writer-active-section';
import {
	createIssueIdToBlockMap,
	getLinkedRepositories,
	parseYamlFrontmatter
} from './dashboard-writer-helpers';
import type { DashboardWriterInstance } from './dashboard-writer-types';

export interface SortOperationsDeps {
	app: App;
	plugin: TasksDashboardPlugin;
	getDashboardFile: (dashboard: DashboardConfig) => TFile | undefined;
}

export interface SortOperationsInstance {
	sortByPriority: DashboardWriterInstance['sortByPriority'];
	sortByCreatedDate: DashboardWriterInstance['sortByCreatedDate'];
	sortByEditedDate: DashboardWriterInstance['sortByEditedDate'];
	sortByWorktreeFolder: DashboardWriterInstance['sortByWorktreeFolder'];
	sortByPrState: DashboardWriterInstance['sortByPrState'];
}

const prStateSortOrder: Record<string, number> = {
	none: 0,
	open: 0,
	draft: 1,
	'review-requested': 2,
	merged: 3,
	closed: 4
};

export function createSortOperations(deps: SortOperationsDeps): SortOperationsInstance {
	const { app, plugin, getDashboardFile } = deps;

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

	const sortByCreatedDate: DashboardWriterInstance['sortByCreatedDate'] = async (
		dashboard,
		direction
	) => {
		const label = direction === 'newest' ? 'newest first' : 'oldest first';
		const dashboardData = await getActiveIssueBlocksFromDashboard(
			app,
			dashboard,
			getDashboardFile
		);
		if (dashboardData === undefined || dashboardData.issues.length < 2) {
			return;
		}

		const sortedBlocks = await getSortedBlocksByDateField(dashboardData, direction, (issue) =>
			readCreatedDateForIssue(issue.filePath)
		);

		await rebuildActiveSectionWithSortedBlocks(
			app,
			dashboard,
			getDashboardFile,
			sortedBlocks,
			`Issues sorted by created date (${label})`
		);
	};

	const sortByEditedDate: DashboardWriterInstance['sortByEditedDate'] = async (
		dashboard,
		direction
	) => {
		const label = direction === 'newest' ? 'recently edited' : 'least recently edited';
		const dashboardData = await getActiveIssueBlocksFromDashboard(
			app,
			dashboard,
			getDashboardFile
		);
		if (dashboardData === undefined || dashboardData.issues.length < 2) {
			return;
		}

		const sortedBlocks = await getSortedBlocksByDateField(dashboardData, direction, (issue) => {
			const issueFile = app.vault.getAbstractFileByPath(issue.filePath);
			return issueFile instanceof TFile ? issueFile.stat.mtime : 0;
		});

		await rebuildActiveSectionWithSortedBlocks(
			app,
			dashboard,
			getDashboardFile,
			sortedBlocks,
			`Issues sorted by ${label}`
		);
	};

	const sortByPriority: DashboardWriterInstance['sortByPriority'] = async (dashboard) => {
		const dashboardData = await getActiveIssueBlocksFromDashboard(
			app,
			dashboard,
			getDashboardFile
		);
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
			app,
			dashboard,
			getDashboardFile,
			sortedBlocks,
			'Issues sorted by priority'
		);
	};

	const sortByWorktreeFolder: DashboardWriterInstance['sortByWorktreeFolder'] = async (
		dashboard
	) => {
		const dashboardData = await getActiveIssueBlocksFromDashboard(
			app,
			dashboard,
			getDashboardFile
		);
		if (dashboardData === undefined) {
			return;
		}

		const { content, issues } = dashboardData;
		if (issues.length < 2) {
			return;
		}

		const issueIdToBlock = createIssueIdToBlockMap(content, issues);

		const issueOriginFolders = new Map<string, string>();
		for (const issue of issues) {
			const block = issueIdToBlock.get(issue.id);
			if (block !== undefined) {
				issueOriginFolders.set(issue.id, extractWorktreeOriginFolderFromBlock(block));
			}
		}

		const sortedIssues = [...issues].sort((a, b) => {
			const folderA = issueOriginFolders.get(a.id) ?? '';
			const folderB = issueOriginFolders.get(b.id) ?? '';
			const folderComparison = folderA.localeCompare(folderB);
			if (folderComparison !== 0) {
				return folderComparison;
			}
			return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
		});

		const sortedBlocks = sortedIssues
			.map((issue) => issueIdToBlock.get(issue.id))
			.filter((block): block is string => block !== undefined);

		await rebuildActiveSectionWithSortedBlocks(
			app,
			dashboard,
			getDashboardFile,
			sortedBlocks,
			'Issues sorted by worktree folder'
		);
	};

	const sortByPrState: DashboardWriterInstance['sortByPrState'] = async (dashboard) => {
		const dashboardData = await getActiveIssueBlocksFromDashboard(
			app,
			dashboard,
			getDashboardFile
		);
		if (dashboardData === undefined) {
			return;
		}

		const { content, issues } = dashboardData;
		if (issues.length < 2) {
			return;
		}

		const issueIdToBlock = createIssueIdToBlockMap(content, issues);

		const issuePrStateOrder = new Map<string, number>();
		for (const issue of issues) {
			const block = issueIdToBlock.get(issue.id);
			if (block === undefined) {
				issuePrStateOrder.set(issue.id, 0);
				continue;
			}

			try {
				const gitStatus = await plugin.gitStatusService.getIssueGitStatus({
					branchName: extractBranchFromBlock(block),
					originFolder: extractWorktreeOriginFolderFromBlock(block),
					baseBranch: undefined,
					githubLinks: extractGithubLinksFromBlock(block),
					dashboardId: dashboard.id,
					issueId: issue.id,
					linkedRepos: getLinkedRepositories(dashboard)
				});
				issuePrStateOrder.set(issue.id, prStateSortOrder[gitStatus.aggregatePrState] ?? 0);
			} catch {
				issuePrStateOrder.set(issue.id, 0);
			}
		}

		const sortedIssues = [...issues].sort((a, b) => {
			const stateA = issuePrStateOrder.get(a.id) ?? 0;
			const stateB = issuePrStateOrder.get(b.id) ?? 0;
			const stateComparison = stateA - stateB;
			if (stateComparison !== 0) {
				return stateComparison;
			}
			return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
		});

		const sortedBlocks = sortedIssues
			.map((issue) => issueIdToBlock.get(issue.id))
			.filter((block): block is string => block !== undefined);

		await rebuildActiveSectionWithSortedBlocks(
			app,
			dashboard,
			getDashboardFile,
			sortedBlocks,
			'Issues sorted by PR state'
		);
	};

	return {
		sortByPriority,
		sortByCreatedDate,
		sortByEditedDate,
		sortByWorktreeFolder,
		sortByPrState
	};
}

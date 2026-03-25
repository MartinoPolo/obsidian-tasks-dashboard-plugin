import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import type { DashboardConfig } from '../types';
import type { PlatformService } from '../utils/platform';
import type { GitStatusServiceInstance } from '../git-status/git-status-service';
import { SYNC_COMMAND, SYNC_COMMAND_ARGS } from '../constants/sync-constants';
import { parseParams } from './dashboard-renderer-params';
import { readDashboardContent } from './dashboard-content-reader';

const CONTROLS_BLOCK_PATTERN = /```tasks-dashboard-controls\n([\s\S]*?)```/g;
const SEQUENTIAL_SPAWN_DELAY_MS = 2000;

interface UnsyncedBranchInfo {
	worktreeFolder: string;
}

export interface SyncAllDependencies {
	app: App;
	dashboard: DashboardConfig;
	dashboardId: string;
	platformService: PlatformService;
	gitStatusService: GitStatusServiceInstance;
}

export async function getUnsyncedBranches(
	dependencies: SyncAllDependencies
): Promise<UnsyncedBranchInfo[]> {
	const { app, dashboard, dashboardId, gitStatusService } = dependencies;
	const dashboardData = await readDashboardContent(app, dashboard);
	if (dashboardData === undefined) {
		return [];
	}
	const { content, parsed } = dashboardData;
	const unsyncedBranches: UnsyncedBranchInfo[] = [];

	for (const issue of parsed.activeIssues) {
		const issueContent = content.substring(issue.startIndex, issue.endIndex);
		for (const match of issueContent.matchAll(CONTROLS_BLOCK_PATTERN)) {
			const controlBlockContent = match[1];
			const controlParams = parseParams(controlBlockContent);
			if (controlParams === null) {
				continue;
			}
			const worktreeFolder = controlParams.worktree_expected_folder;
			if (worktreeFolder === undefined || worktreeFolder === '') {
				continue;
			}
			const cachedStatus = gitStatusService.getCachedStatus(dashboardId, issue.id);
			if (cachedStatus === undefined) {
				continue;
			}
			const behindCount = cachedStatus.behindBaseCount;
			if (behindCount === undefined || behindCount <= 0) {
				continue;
			}
			unsyncedBranches.push({ worktreeFolder });
		}
	}

	return unsyncedBranches;
}

export async function handleSyncAllBranches(dependencies: SyncAllDependencies): Promise<void> {
	const { platformService } = dependencies;
	const unsyncedBranches = await getUnsyncedBranches(dependencies);
	if (unsyncedBranches.length === 0) {
		new Notice('No branches need syncing.');
		return;
	}

	new Notice(
		`Syncing ${unsyncedBranches.length} branch${unsyncedBranches.length === 1 ? '' : 'es'}...`
	);

	for (let index = 0; index < unsyncedBranches.length; index++) {
		const branch = unsyncedBranches[index];
		platformService.openTerminalWithCommand(branch.worktreeFolder, SYNC_COMMAND, [
			...SYNC_COMMAND_ARGS
		]);
		const isLastBranch = index === unsyncedBranches.length - 1;
		if (!isLastBranch) {
			await new Promise<void>((resolve) => {
				window.setTimeout(resolve, SEQUENTIAL_SPAWN_DELAY_MS);
			});
		}
	}
}

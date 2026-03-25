import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import type { DashboardConfig } from '../types';
import type { PlatformService } from '../utils/platform';
import type { GitStatusServiceInstance } from '../git-status/git-status-service';
import type { IssueManagerInstance } from '../issues/issue-manager-types';
import type { PrunableIssueInfo } from '../modals/prune-confirmation-modal';
import { isFullyClosed } from '../git-status/git-status-types';
import { parseParams } from './dashboard-renderer-params';
import { readDashboardContent } from './dashboard-content-reader';
import { PruneConfirmationModal } from '../modals/prune-confirmation-modal';

const CONTROLS_BLOCK_PATTERN = /```tasks-dashboard-controls\n([\s\S]*?)```/g;

export interface PruneDependencies {
	app: App;
	dashboard: DashboardConfig;
	dashboardId: string;
	platformService: PlatformService;
	gitStatusService: GitStatusServiceInstance;
	issueManager: IssueManagerInstance;
	triggerDashboardRefresh: () => void;
}

export async function getPrunableIssues(
	dependencies: PruneDependencies
): Promise<PrunableIssueInfo[]> {
	const { app, dashboard, dashboardId, gitStatusService } = dependencies;
	const dashboardData = await readDashboardContent(app, dashboard);
	if (dashboardData === undefined) {
		return [];
	}
	const { content, parsed } = dashboardData;
	const prunableIssues: PrunableIssueInfo[] = [];

	for (const issue of parsed.activeIssues) {
		const issueContent = content.substring(issue.startIndex, issue.endIndex);
		for (const match of issueContent.matchAll(CONTROLS_BLOCK_PATTERN)) {
			const controlBlockContent = match[1];
			const controlParams = parseParams(controlBlockContent);
			if (controlParams === null || controlParams.worktree !== true) {
				continue;
			}
			const branchName = controlParams.worktree_branch;
			if (branchName === undefined || branchName === '') {
				continue;
			}
			const cachedStatus = gitStatusService.getCachedStatus(dashboardId, issue.id);
			if (cachedStatus === undefined) {
				continue;
			}
			if (isFullyClosed(cachedStatus)) {
				prunableIssues.push({
					issueId: issue.id,
					issueName: issue.name,
					branchName
				});
			}
		}
	}

	return prunableIssues;
}

export async function archiveIssuesSequentially(
	issueManager: IssueManagerInstance,
	dashboard: DashboardConfig,
	issues: PrunableIssueInfo[]
): Promise<number> {
	let archivedCount = 0;
	for (const issue of issues) {
		try {
			await issueManager.archiveIssue(dashboard, issue.issueId);
			archivedCount++;
		} catch {
			new Notice(`Could not archive: ${issue.issueName}`);
		}
	}
	return archivedCount;
}

export interface PruneWorkflowCallbacks {
	onPruneStart: () => void;
	onPruneEnd: () => void;
	onPrunableCountUpdate: (count: number) => void;
	getCachedPrunableIssues: () => PrunableIssueInfo[];
	setCachedPrunableIssues: (issues: PrunableIssueInfo[]) => void;
}

export async function handlePruneWorktrees(
	dependencies: PruneDependencies,
	callbacks: PruneWorkflowCallbacks
): Promise<void> {
	const { app, dashboard, platformService, issueManager, triggerDashboardRefresh } = dependencies;

	callbacks.onPruneStart();

	try {
		const cachedIssues = callbacks.getCachedPrunableIssues();
		const prunableIssues =
			cachedIssues.length > 0 ? cachedIssues : await getPrunableIssues(dependencies);

		if (prunableIssues.length === 0) {
			new Notice('No closed worktrees to prune.');
			callbacks.onPruneEnd();
			return;
		}

		new PruneConfirmationModal(app, prunableIssues, (confirmed) => {
			if (!confirmed) {
				callbacks.onPruneEnd();
				return;
			}

			const branchNames = prunableIssues.map((issue) => issue.branchName);
			const launched = platformService.runBulkWorktreeRemovalScript(
				branchNames,
				dashboard.projectFolder
			);

			if (!launched) {
				new Notice('Could not launch worktree removal script.');
				callbacks.onPruneEnd();
				return;
			}

			void archiveIssuesSequentially(issueManager, dashboard, prunableIssues).then(
				(archivedCount) => {
					const total = prunableIssues.length;
					if (archivedCount === total) {
						new Notice(
							`Pruned ${total} worktree${total === 1 ? '' : 's'} and archived ${total} issue${total === 1 ? '' : 's'}.`
						);
					} else {
						new Notice(
							`Pruned ${total} worktree${total === 1 ? '' : 's'}. Archived ${archivedCount} of ${total} issue${total === 1 ? '' : 's'}.`
						);
					}
					triggerDashboardRefresh();
					// Re-check prunable count after pruning
					void getPrunableIssues(dependencies).then((issues) => {
						callbacks.setCachedPrunableIssues(issues);
						callbacks.onPrunableCountUpdate(issues.length);
					});
					callbacks.onPruneEnd();
				}
			);
		}).open();
	} catch {
		callbacks.onPruneEnd();
	}
}

export function updatePrunableCount(
	dependencies: PruneDependencies,
	callbacks: Pick<PruneWorkflowCallbacks, 'onPrunableCountUpdate' | 'setCachedPrunableIssues'>,
	inProgressFlag: { value: boolean }
): void {
	if (inProgressFlag.value) {
		return;
	}
	inProgressFlag.value = true;
	void getPrunableIssues(dependencies).then((issues) => {
		callbacks.setCachedPrunableIssues(issues);
		callbacks.onPrunableCountUpdate(issues.length);
		inProgressFlag.value = false;
	});
}

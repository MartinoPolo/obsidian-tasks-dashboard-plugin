import { Notice } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { ArchiveConfirmationModal } from '../modals/archive-confirmation-modal';
import {
	DeleteConfirmationModal,
	type DeleteConfirmationResult
} from '../modals/delete-confirmation-modal';
import { recordDeletedIssueGitHubUrls } from '../issues/issue-manager-settings';
import { isGitHubWebUrl } from '../utils/github';
import type { DashboardConfig } from '../types';
import type { ControlParams } from './dashboard-renderer-types';

interface ConfirmationDependencies {
	plugin: TasksDashboardPlugin;
	dashboard: DashboardConfig;
	params: ControlParams;
}

export function handleArchiveWithConfirmation(dependencies: ConfirmationDependencies): void {
	const { plugin, dashboard, params } = dependencies;

	void Promise.all([
		plugin.issueManager.hasAssociatedWorktree(dashboard, params.issue),
		plugin.progressTracker.getProgress(params.path)
	])
		.then(([hasAssociatedWorktree, progress]) => {
			const unfinishedTaskCount = progress.total - progress.done;
			if (!hasAssociatedWorktree && unfinishedTaskCount === 0) {
				void plugin.issueManager.archiveIssue(dashboard, params.issue);
				return;
			}

			const modal = new ArchiveConfirmationModal(
				plugin.app,
				params.name,
				hasAssociatedWorktree,
				unfinishedTaskCount,
				(result) => {
					if (!result.confirmed) {
						return;
					}
					if (result.removeWorktree) {
						void plugin.issueManager.removeWorktree(dashboard, params.issue, {
							skipScriptConfirmation: true
						});
					}
					void plugin.issueManager.archiveIssue(dashboard, params.issue);
				}
			);
			modal.open();
		})
		.catch(() => {
			new Notice(`Could not archive: ${params.issue}`);
		});
}

export function handleDeleteWithConfirmation(dependencies: ConfirmationDependencies): void {
	const { plugin, dashboard, params } = dependencies;

	void Promise.all([
		plugin.issueManager.hasAssociatedWorktree(dashboard, params.issue),
		plugin.progressTracker.getProgress(params.path)
	])
		.then(([hasAssociatedWorktree, progress]) => {
			const unfinishedTaskCount = progress.total - progress.done;
			const modal = new DeleteConfirmationModal(
				plugin.app,
				params.name,
				hasAssociatedWorktree,
				unfinishedTaskCount,
				hasAssociatedWorktree ? plugin.settings.deleteIssueRemoveWorktreeByDefault : false,
				(checked: boolean) => {
					plugin.settings.deleteIssueRemoveWorktreeByDefault = checked;
					void plugin.saveSettings();
				},
				(result: DeleteConfirmationResult) => {
					if (!result.confirmed) {
						return;
					}
					if (result.removeWorktree) {
						void plugin.issueManager.removeWorktree(dashboard, params.issue, {
							skipScriptConfirmation: true
						});
					}
					void plugin.issueManager.deleteIssue(dashboard, params.issue).then(() => {
						const webUrls = params.githubLinks.filter(isGitHubWebUrl);
						if (recordDeletedIssueGitHubUrls(plugin.settings, dashboard.id, webUrls)) {
							void plugin.saveSettings();
						}
					});
				}
			);
			modal.open();
		})
		.catch(() => {
			new Notice(`Could not delete: ${params.issue}`);
		});
}

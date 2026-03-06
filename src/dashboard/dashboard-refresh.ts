import { Notice, TFile } from 'obsidian';
import type TasksDashboardPlugin from '../../main';
import type { DashboardConfig } from '../types';
import { getDashboardPath } from '../utils/dashboard-path';
import { parseDashboard } from './DashboardParser';

const WORKTREE_TRUE_PATTERN = /\bworktree:\s*true\b/;
const GITHUB_LINK_PATTERN = /github_link:\s*(\S+)/g;

interface ParsedIssueRefreshInfo {
	issueId: string;
	isWorktreeIssue: boolean;
	githubLinks: string[];
}

function extractIssueRefreshInfo(
	content: string,
	startIndex: number,
	endIndex: number,
	issueId: string
): ParsedIssueRefreshInfo {
	const blockContent = content.substring(startIndex, endIndex);
	const isWorktreeIssue = WORKTREE_TRUE_PATTERN.test(blockContent);

	const githubLinks: string[] = [];
	let linkMatch: RegExpExecArray | null;
	const linkPattern = new RegExp(GITHUB_LINK_PATTERN.source, 'g');
	while ((linkMatch = linkPattern.exec(blockContent)) !== null) {
		githubLinks.push(linkMatch[1]);
	}

	return { issueId, isWorktreeIssue, githubLinks };
}

export async function refreshDashboard(
	plugin: TasksDashboardPlugin,
	dashboard: DashboardConfig
): Promise<void> {
	const dashboardPath = getDashboardPath(dashboard);
	const abstractFile = plugin.app.vault.getAbstractFileByPath(dashboardPath);
	if (!(abstractFile instanceof TFile)) {
		new Notice('Dashboard file not found');
		return;
	}

	const content = await plugin.app.vault.read(abstractFile);
	const parsed = parseDashboard(content);
	const activeIssues = parsed.activeIssues;

	if (activeIssues.length === 0) {
		new Notice('No active issues to refresh');
		return;
	}

	new Notice(`Refreshing ${activeIssues.length} issues...`);

	const issueRefreshInfoList = activeIssues.map((issue) =>
		extractIssueRefreshInfo(content, issue.startIndex, issue.endIndex, issue.id)
	);

	let worktreeRefreshCount = 0;
	let githubRefreshCount = 0;
	let errorCount = 0;

	// Refresh worktree states
	for (const issueInfo of issueRefreshInfoList) {
		if (!issueInfo.isWorktreeIssue) {
			continue;
		}

		try {
			await plugin.issueManager.refreshWorktreeState(dashboard, issueInfo.issueId);
			worktreeRefreshCount += 1;
		} catch {
			errorCount += 1;
		}
	}

	// Refresh GitHub metadata by clearing cache then triggering re-render
	const hasGitHubEnabled = dashboard.githubEnabled && plugin.githubService.isAuthenticated();

	if (hasGitHubEnabled) {
		const allGithubLinks = issueRefreshInfoList.flatMap((issueInfo) => issueInfo.githubLinks);

		for (const githubUrl of allGithubLinks) {
			plugin.githubService.clearCacheForUrl(githubUrl);
			githubRefreshCount += 1;
		}
	}

	plugin.triggerDashboardRefresh();

	const summaryParts: string[] = [];
	if (worktreeRefreshCount > 0) {
		summaryParts.push(
			`${worktreeRefreshCount} worktree${worktreeRefreshCount === 1 ? '' : 's'}`
		);
	}
	if (githubRefreshCount > 0) {
		summaryParts.push(
			`${githubRefreshCount} GitHub link${githubRefreshCount === 1 ? '' : 's'}`
		);
	}
	if (errorCount > 0) {
		summaryParts.push(`${errorCount} error${errorCount === 1 ? '' : 's'}`);
	}

	const summary =
		summaryParts.length > 0
			? `Refreshed: ${summaryParts.join(', ')}`
			: 'Dashboard refreshed (no worktrees or GitHub links found)';
	new Notice(summary);
}

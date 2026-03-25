import type { GitStatusDisplayInfo } from '../git-status/git-status-helpers';
import { INFO_SECTION_HEADER_PREFIX } from '../git-status/git-status-helpers';
import type { Priority, WorktreeSetupState } from '../types';

export interface InfoContentParams {
	name: string;
	priority: Priority | undefined;
	githubLinks: string[];
	isWorktreeIssue: boolean;
	worktreeBaseBranch: string | undefined;
	worktreeBranch: string | undefined;
	worktreeExpectedFolder: string | undefined;
	worktreeSetupState: WorktreeSetupState | undefined;
}

export function buildInfoContent(
	params: InfoContentParams,
	gitStatusDisplay: GitStatusDisplayInfo | undefined
): string {
	const h = INFO_SECTION_HEADER_PREFIX;
	const sections: string[] = [];

	// == Issue section ==
	const issueLines = [`${h}Issue`, `Name: ${params.name}`];
	if (params.priority !== undefined) {
		issueLines.push(`Priority: ${params.priority}`);
	}
	sections.push(issueLines.join('\n'));

	// == GitHub section ==
	const githubLines = [`${h}GitHub`];
	if (params.githubLinks.length > 0) {
		for (const link of params.githubLinks) {
			githubLines.push(link);
		}
	} else {
		githubLines.push('No linked issues');
	}
	if (gitStatusDisplay !== undefined && gitStatusDisplay.prLines.length > 0) {
		githubLines.push('');
		githubLines.push('Pull requests:');
		for (const prLine of gitStatusDisplay.prLines) {
			githubLines.push(`  ${prLine}`);
		}
	}
	sections.push(githubLines.join('\n'));

	// == Branch section ==
	const branchSectionLines = [`${h}Branch`];
	if (params.isWorktreeIssue) {
		branchSectionLines.push(`Base: ${params.worktreeBaseBranch ?? 'n/a'}`);
		branchSectionLines.push(`Local: ${params.worktreeBranch ?? 'n/a'}`);
		const remoteBranch =
			params.worktreeBranch !== undefined ? `origin/${params.worktreeBranch}` : 'n/a';
		branchSectionLines.push(`Remote: ${remoteBranch}`);
		if (gitStatusDisplay?.branchStatusLine !== undefined) {
			branchSectionLines.push(gitStatusDisplay.branchStatusLine);
		}
	} else {
		branchSectionLines.push('No branch linked');
	}
	sections.push(branchSectionLines.join('\n'));

	// == Worktree section ==
	const worktreeLines = [`${h}Worktree`];
	if (params.isWorktreeIssue) {
		worktreeLines.push(`Folder: ${params.worktreeExpectedFolder ?? 'n/a'}`);
		worktreeLines.push(`State: ${params.worktreeSetupState ?? 'n/a'}`);
	} else {
		worktreeLines.push('Not a worktree issue');
	}
	sections.push(worktreeLines.join('\n'));

	// == Footer ==
	if (gitStatusDisplay !== undefined) {
		sections.push(`Last refreshed: ${gitStatusDisplay.lastRefreshed}`);
	} else {
		sections.push('Last refreshed: Not yet');
	}

	return sections.join('\n\n');
}

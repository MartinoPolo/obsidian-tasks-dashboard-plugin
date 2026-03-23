import { formatRelativeTimestamp } from '../utils/github-helpers';
import type { IssueGitStatus } from './git-status-types';

export interface GitStatusDisplayInfo {
	infoLines: string[];
	prAccentClass: string;
}

export function buildGitStatusDisplayInfo(result: IssueGitStatus): GitStatusDisplayInfo {
	const lines: string[] = [];
	if (result.branchName !== undefined) {
		lines.push(`Branch: ${result.branchName} (${result.branchStatus})`);
		if (result.baseBranch !== undefined) {
			lines.push(`Base branch: ${result.baseBranch}`);
		}
	}
	if (result.linkedPullRequests.length > 0) {
		const prLines = result.linkedPullRequests.map(
			(pr) => `  #${pr.number} ${pr.state} \u2014 ${pr.title}`
		);
		lines.push(`PRs:\n${prLines.join('\n')}`);
	}
	lines.push(`Last refreshed: ${formatRelativeTimestamp(result.fetchedAt)}`);

	const prAccentClass =
		result.aggregatePrState !== 'none' ? `tdc-pr-accent-${result.aggregatePrState}` : '';

	return { infoLines: lines, prAccentClass };
}

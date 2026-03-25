import { formatRelativeTimestamp } from '../utils/github-helpers';
import type { IssueGitStatus } from './git-status-types';

export const INFO_SECTION_HEADER_PREFIX = '## ';

export interface GitStatusDisplayInfo {
	branchStatusLine: string | undefined;
	prLines: string[];
	lastRefreshed: string;
	prAccentClass: string;
}

export function buildGitStatusDisplayInfo(result: IssueGitStatus): GitStatusDisplayInfo {
	const branchStatusLine =
		result.branchName !== undefined ? `Status: ${result.branchStatus}` : undefined;

	const prLines: string[] = [];
	for (const pr of result.linkedPullRequests) {
		prLines.push(`#${pr.number} ${pr.state} \u2014 ${pr.title}`);
	}

	const prAccentClass =
		result.aggregatePrState !== 'none' ? `tdc-pr-accent-${result.aggregatePrState}` : '';

	return {
		branchStatusLine,
		prLines,
		lastRefreshed: formatRelativeTimestamp(result.fetchedAt),
		prAccentClass
	};
}

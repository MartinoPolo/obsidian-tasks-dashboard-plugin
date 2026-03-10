import { TFile } from 'obsidian';
import { DashboardConfig, Issue, Priority, PRIORITY_ORDER } from '../types';
import {
	buildIssueMarkerEnd,
	buildIssueMarkerStart,
	DASHBOARD_NOTES_MARKER
} from './dashboard-markers';
import {
	ARCHIVE_HEADER,
	FORBIDDEN_PROTO_KEYS,
	ISSUE_ACTIVE_FOLDER,
	ISSUE_ARCHIVE_FOLDER,
	ISSUE_SECTION_ROOT,
	NOTES_HEADER,
	SECTION_SEPARATOR,
	YAML_FRONTMATTER_REGEX
} from './dashboard-writer-constants';
import {
	ExtractedIssueBlock,
	IssueBlockParams,
	ParsedDashboardIssue,
	ParsedIssueFile
} from './dashboard-writer-types';

export const hasDashboardLinkedRepository = (dashboard: DashboardConfig): boolean => {
	return dashboard.githubEnabled && (dashboard.githubRepos?.length ?? 0) > 0;
};

export const getLinkedRepositories = (dashboard: DashboardConfig): string[] => {
	return dashboard.githubRepos ?? [];
};

export const buildAssignedIssuesSection = (dashboardId: string): string => {
	return `# Assigned Issues
\x60\x60\x60tasks-dashboard-assigned
dashboard: ${dashboardId}
\x60\x60\x60
`;
};

export const buildIssueRelativePath = (issueId: string, isArchived: boolean): string => {
	const folder = isArchived ? ISSUE_ARCHIVE_FOLDER : ISSUE_ACTIVE_FOLDER;
	return `${ISSUE_SECTION_ROOT}/${folder}/${issueId}`;
};

export const buildSortBlock = (dashboardId: string, dashboardFilename?: string): string => {
	const displayName = (
		dashboardFilename !== undefined && dashboardFilename !== ''
			? dashboardFilename
			: 'Dashboard'
	).replace(/\.md$/i, '');
	return `# ${displayName}\n\`\`\`tasks-dashboard-sort\ndashboard: ${dashboardId}\n\`\`\`\n`;
};

export const escapeRegExp = (value: string): string => {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const removeLegacyIssueSeparator = (issueBlock: string): string => {
	return issueBlock.replace(/\n---\n(?=%% ISSUE:[\w-]+:END %%)/g, '\n');
};

export const getFrontmatterText = (content: string): string | undefined => {
	const frontmatterMatch = content.match(YAML_FRONTMATTER_REGEX);
	if (frontmatterMatch === null) {
		return undefined;
	}

	return frontmatterMatch[1];
};

export const buildIssueMarkdownBlock = (params: IssueBlockParams): string => {
	const relativePath = buildIssueRelativePath(params.id, params.isArchived);
	const githubLines = params.githubLinks.map((url) => `github_link: ${url}\n`).join('');
	const worktreeLines =
		params.worktree === true
			? [
					'worktree: true',
					params.worktreeBranch !== undefined
						? `worktree_branch: ${params.worktreeBranch}`
						: undefined,
					params.worktreeOriginFolder !== undefined
						? `worktree_origin_folder: ${params.worktreeOriginFolder}`
						: undefined,
					params.worktreeExpectedFolder !== undefined
						? `worktree_expected_folder: ${params.worktreeExpectedFolder}`
						: undefined,
					params.worktreeSetupState !== undefined
						? `worktree_setup_state: ${params.worktreeSetupState}`
						: undefined,
					params.worktreeBaseRepository !== undefined
						? `worktree_base_repository: ${params.worktreeBaseRepository}`
						: undefined,
					params.worktreeBaseBranch !== undefined
						? `worktree_base_branch: ${params.worktreeBaseBranch}`
						: undefined,
					params.worktreeSafeDelete === true ? 'worktree_safe_delete: true' : undefined
				]
					.filter((line): line is string => line !== undefined)
					.map((line) => `${line}\n`)
					.join('')
			: '';

	return `${buildIssueMarkerStart(params.id)}
\`\`\`tasks-dashboard-controls
issue: ${params.id}
name: ${params.name}
path: ${params.filePath}
dashboard: ${params.dashboardId}
priority: ${params.priority}
${githubLines}${worktreeLines}\`\`\`
\`\`\`tasks
path includes ${relativePath}
not done
limit 10
sort by priority
short mode
hide task count
hide tags
show tree
\`\`\`
${buildIssueMarkerEnd(params.id)}`;
};

export const parseYamlFrontmatter = (content: string): Record<string, string> => {
	const frontmatterText = getFrontmatterText(content);
	if (frontmatterText === undefined) {
		return {};
	}

	const result: Record<string, string> = {};
	const lines = frontmatterText.split('\n');

	for (const line of lines) {
		const colonIndex = line.indexOf(':');
		if (colonIndex === -1) {
			continue;
		}

		const key = line.substring(0, colonIndex).trim();
		if (FORBIDDEN_PROTO_KEYS.has(key)) {
			continue;
		}

		const value = line.substring(colonIndex + 1).trim();
		result[key] = value;
	}

	return result;
};

const stripYamlQuotes = (value: string | undefined): string | undefined => {
	if (value === undefined) {
		return undefined;
	}

	const singleQuotedMatch = value.match(/^'(.*)'$/);
	if (singleQuotedMatch !== null) {
		return singleQuotedMatch[1].replace(/''/g, "'");
	}

	const doubleQuotedMatch = value.match(/^"(.*)"$/);
	if (doubleQuotedMatch !== null) {
		return doubleQuotedMatch[1].replace(/\\"/g, '"');
	}

	return value;
};

export const extractIssueName = (content: string): string | undefined => {
	const withoutFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '');
	const headerMatch = withoutFrontmatter.match(/^#\s+(.+)$/m);
	return headerMatch !== null ? headerMatch[1].trim() : undefined;
};

export const extractGithubLinksFromFrontmatter = (content: string): string[] => {
	const frontmatterText = getFrontmatterText(content);
	if (frontmatterText === undefined) {
		return [];
	}

	const githubLinksUrls: string[] = [];
	const urlEntryPattern = /^\s+-\s*url:\s*"?([^"\n]+)"?/gm;

	if (frontmatterText.includes('github_links:')) {
		let urlMatch: RegExpExecArray | null;
		while ((urlMatch = urlEntryPattern.exec(frontmatterText)) !== null) {
			githubLinksUrls.push(urlMatch[1].trim());
		}

		if (githubLinksUrls.length > 0) {
			return githubLinksUrls;
		}
	}

	const oldGithubMatch = frontmatterText.match(/^github:\s*\n((?:\s+\w+:.*\n?)*)/m);
	if (oldGithubMatch !== null) {
		const oldUrlMatch = oldGithubMatch[0].match(/url:\s*"?([^"\n]+)"?/);
		if (oldUrlMatch !== null) {
			return [oldUrlMatch[1].trim()];
		}
	}

	return [];
};

export const extractNotesSection = (existingContent: string): string => {
	const notesMarkerIndex = existingContent.indexOf(DASHBOARD_NOTES_MARKER);
	const notesHeaderIndex = existingContent.indexOf(NOTES_HEADER);
	const archiveHeaderIndex = existingContent.indexOf(ARCHIVE_HEADER);

	if (archiveHeaderIndex === -1) {
		return '';
	}

	let notesStartIndex = -1;

	if (notesMarkerIndex !== -1 && notesMarkerIndex < archiveHeaderIndex) {
		notesStartIndex = notesMarkerIndex + DASHBOARD_NOTES_MARKER.length;
	} else if (notesHeaderIndex !== -1 && notesHeaderIndex < archiveHeaderIndex) {
		notesStartIndex = notesHeaderIndex + NOTES_HEADER.length;
	}

	if (notesStartIndex === -1) {
		return '';
	}

	const rawNotesContent = existingContent.substring(notesStartIndex, archiveHeaderIndex);
	const cleanedNotesContent = rawNotesContent.replace(/^\s*%% TASKS-DASHBOARD:NOTES %%\s*/, '');

	return cleanedNotesContent.trim();
};

export const parseIssueFile = (file: TFile, content: string): ParsedIssueFile | undefined => {
	const frontmatter = parseYamlFrontmatter(content);
	const frontmatterText = getFrontmatterText(content) ?? '';
	const name = extractIssueName(content);

	if (name === undefined) {
		return undefined;
	}

	const priorityValue = frontmatter['priority'];
	const priority: Priority =
		priorityValue === 'low' ||
		priorityValue === 'medium' ||
		priorityValue === 'high' ||
		priorityValue === 'top'
			? priorityValue
			: 'medium';

	const hasMergedPullRequestMetadata =
		/-\s+url:\s*"https?:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+"[\s\S]*?merged:\s*"?true"?/m.test(
			frontmatterText
		);

	return {
		id: file.basename,
		name,
		priority,
		created: frontmatter['created'] || new Date().toISOString(),
		filePath: file.path,
		githubLinks: extractGithubLinksFromFrontmatter(content),
		worktree: frontmatter['worktree'] === 'true',
		worktreeBranch: stripYamlQuotes(frontmatter['worktree_branch']),
		worktreeOriginFolder: stripYamlQuotes(frontmatter['worktree_origin_folder']),
		worktreeExpectedFolder: stripYamlQuotes(frontmatter['worktree_expected_folder']),
		worktreeSetupState:
			frontmatter['worktree_setup_state'] === 'pending' ||
			frontmatter['worktree_setup_state'] === 'active' ||
			frontmatter['worktree_setup_state'] === 'failed'
				? frontmatter['worktree_setup_state']
				: undefined,
		worktreeBaseRepository: stripYamlQuotes(frontmatter['worktree_base_repository']),
		worktreeBaseBranch: stripYamlQuotes(frontmatter['worktree_base_branch']),
		worktreeSafeDelete: hasMergedPullRequestMetadata
	};
};

export const parsedIssueFileToBlockParams = (
	issueFile: ParsedIssueFile,
	isArchived: boolean,
	dashboard: DashboardConfig
): IssueBlockParams => {
	return {
		id: issueFile.id,
		name: issueFile.name,
		filePath: issueFile.filePath,
		dashboardId: dashboard.id,
		priority: issueFile.priority,
		githubLinks: issueFile.githubLinks,
		worktree: issueFile.worktree,
		worktreeBranch: issueFile.worktreeBranch,
		worktreeOriginFolder: issueFile.worktreeOriginFolder,
		worktreeExpectedFolder: issueFile.worktreeExpectedFolder,
		worktreeSetupState: issueFile.worktreeSetupState,
		worktreeBaseRepository: issueFile.worktreeBaseRepository,
		worktreeBaseBranch: issueFile.worktreeBaseBranch,
		worktreeSafeDelete: issueFile.worktreeSafeDelete,
		isArchived
	};
};

export const toIssueBlockParams = (issue: Issue, dashboard: DashboardConfig): IssueBlockParams => {
	const githubLinks = issue.githubLinks ?? [];

	return {
		id: issue.id,
		name: issue.name,
		filePath: issue.filePath,
		dashboardId: dashboard.id,
		priority: issue.priority,
		githubLinks,
		worktree: issue.worktree === true,
		worktreeBranch: issue.worktreeBranch,
		worktreeOriginFolder: issue.worktreeOriginFolder,
		worktreeExpectedFolder: issue.worktreeExpectedFolder,
		worktreeSetupState: issue.worktreeSetupState,
		worktreeBaseRepository: issue.worktreeBaseRepository,
		worktreeBaseBranch: issue.worktreeBaseBranch,
		worktreeSafeDelete: issue.worktreeSafeDelete,
		isArchived: false
	};
};

export const sortIssueFilesByPriorityAndCreatedDate = (
	a: ParsedIssueFile,
	b: ParsedIssueFile
): number => {
	const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
	if (priorityDiff !== 0) {
		return priorityDiff;
	}

	return new Date(b.created).getTime() - new Date(a.created).getTime();
};

export const extractAndRemoveIssueBlock = (
	content: string,
	issueId: string
): ExtractedIssueBlock | undefined => {
	const issueStartMarker = buildIssueMarkerStart(issueId);
	const issueEndMarker = buildIssueMarkerEnd(issueId);
	const startIndex = content.indexOf(issueStartMarker);
	const endIndex = content.indexOf(issueEndMarker);

	if (startIndex === -1 || endIndex === -1) {
		return undefined;
	}

	const block = content.substring(startIndex, endIndex + issueEndMarker.length);
	let cleanedContent =
		content.slice(0, startIndex) + content.slice(endIndex + issueEndMarker.length);

	const separatorAfter = cleanedContent.indexOf(SECTION_SEPARATOR, startIndex);
	if (separatorAfter !== -1 && separatorAfter < startIndex + 10) {
		cleanedContent =
			cleanedContent.slice(0, startIndex) +
			cleanedContent.slice(separatorAfter + SECTION_SEPARATOR.length);
	}

	return { block, cleanedContent };
};

export const insertBeforeMarker = (
	content: string,
	marker: string,
	insertion: string
): string | undefined => {
	const insertIndex = content.indexOf(marker);
	if (insertIndex === -1) {
		return undefined;
	}

	return content.slice(0, insertIndex) + insertion + content.slice(insertIndex);
};

export const createIssueIdToBlockMap = (
	content: string,
	issues: ParsedDashboardIssue[]
): Map<string, string> => {
	const issueBlocks = new Map<string, string>();

	for (const issue of issues) {
		issueBlocks.set(issue.id, content.substring(issue.startIndex, issue.endIndex));
	}

	return issueBlocks;
};

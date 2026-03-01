import { DashboardConfig, GitHubIssueMetadata, GitHubStoredMetadata, Issue } from '../types';
import {
	appendBeforeFrontmatterClose,
	escapeForRegExp,
	getDashboardFilename,
	getFrontmatterCloseIndex
} from './issue-manager-shared';
import { isGitHubRepoUrl, parseGitHubRepoFullName } from '../utils/github-url';
import { parseGitHubUrlInfo } from '../utils/github';

function formatGitHubLinkText(url: string, metadata?: GitHubStoredMetadata): string {
	if (metadata !== undefined) {
		return `#${metadata.number} - ${metadata.title}`;
	}
	const parsed = parseGitHubUrlInfo(url);
	if (parsed !== undefined) {
		return `#${parsed.number}`;
	}
	if (isGitHubRepoUrl(url)) {
		const repoFullName = parseGitHubRepoFullName(url);
		if (repoFullName !== undefined) {
			return repoFullName;
		}
	}
	return 'GitHub Link';
}

export function buildGitHubMetadataYaml(
	metadata: GitHubStoredMetadata,
	indent: string = '    '
): string {
	let yaml = '';
	yaml += `\n${indent}number: ${metadata.number}`;
	yaml += `\n${indent}state: "${metadata.state}"`;
	yaml += `\n${indent}title: "${metadata.title.replace(/"/g, '\\"')}"`;
	yaml += `\n${indent}labels: [${metadata.labels.map((l) => `"${l}"`).join(', ')}]`;
	yaml += `\n${indent}lastFetched: "${metadata.lastFetched}"`;
	return yaml;
}

function buildGitHubFrontmatterEntry(
	githubUrl: string,
	storedMetadata: GitHubStoredMetadata | undefined
): string {
	let entry = `\n  - url: "${githubUrl}"`;
	if (storedMetadata !== undefined) {
		entry += buildGitHubMetadataYaml(storedMetadata);
	}

	return entry;
}

function generateGithubLinksFrontmatter(
	links: string[],
	metadataList: GitHubStoredMetadata[]
): string {
	if (links.length === 0) {
		return '';
	}
	let yaml = '\ngithub_links:';
	for (let index = 0; index < links.length; index++) {
		const url = links[index];
		const metadata = metadataList.at(index);
		yaml += `\n  - url: "${url}"`;
		if (metadata !== undefined) {
			yaml += buildGitHubMetadataYaml(metadata);
		}
	}
	return yaml;
}

function generateGithubLinksBody(
	links: string[],
	metadataList: GitHubStoredMetadata[],
	dashboardId: string
): string {
	let body = '';
	for (let index = 0; index < links.length; index++) {
		const url = links[index];
		const metadata = metadataList.at(index);
		const linkText = formatGitHubLinkText(url, metadata);
		body += `\n[${linkText}](${url})

\`\`\`tasks-dashboard-github
url: ${url}
dashboard: ${dashboardId}
\`\`\``;
	}
	return body;
}

export function toStoredGitHubMetadata(
	metadata: GitHubIssueMetadata | undefined
): GitHubStoredMetadata | undefined {
	if (metadata === undefined) {
		return undefined;
	}

	return {
		url: metadata.url,
		number: metadata.number,
		state: metadata.state,
		title: metadata.title,
		labels: metadata.labels.map((label) => label.name),
		lastFetched: new Date().toISOString()
	};
}

export function generateIssueContent(issue: Issue, dashboard: DashboardConfig): string {
	const filename = getDashboardFilename(dashboard);
	const relativePath = '../'.repeat(2) + encodeURI(filename);

	const links =
		issue.githubLinks ??
		(issue.githubLink !== undefined && issue.githubLink !== '' ? [issue.githubLink] : []);
	const metadataList =
		issue.githubMetadataList ??
		(issue.githubMetadata !== undefined ? [issue.githubMetadata] : []);

	let frontmatter = `---
created: ${issue.created}
status: ${issue.status}
priority: ${issue.priority}`;

	frontmatter += generateGithubLinksFrontmatter(links, metadataList);

	frontmatter += `
---`;

	let content = `${frontmatter}
[← Back to Dashboard](${relativePath})
# ${issue.name}`;

	content += generateGithubLinksBody(links, metadataList, dashboard.id);

	content += `
---
## Tasks
- [ ] `;

	return content;
}

function migrateOldGitHubFormat(content: string, frontmatterSection: string): string {
	const oldGithubMatch = frontmatterSection.match(/^github:\s*\n((?:\s+\w+:.*\n?)*)/m);
	if (oldGithubMatch === null) {
		return content;
	}

	const oldUrlMatch = oldGithubMatch[0].match(/url:\s*"?([^"\n]+)"?/);
	const oldUrl = oldUrlMatch !== null ? oldUrlMatch[1].trim() : undefined;

	const migrated = content.replace(oldGithubMatch[0], '');

	let githubLinksFrontmatter = '\ngithub_links:';
	if (oldUrl !== undefined) {
		githubLinksFrontmatter += `\n  - url: "${oldUrl}"`;
		const oldNumberMatch = oldGithubMatch[0].match(/number:\s*(\d+)/);
		const oldStateMatch = oldGithubMatch[0].match(/state:\s*"?([^"\n]+)"?/);
		const oldTitleMatch = oldGithubMatch[0].match(/title:\s*"([^"]+)"/);
		const oldLabelsMatch = oldGithubMatch[0].match(/labels:\s*\[([^\]]*)\]/);
		const oldFetchedMatch = oldGithubMatch[0].match(/lastFetched:\s*"([^"]+)"/);
		if (oldNumberMatch !== null) {
			githubLinksFrontmatter += `\n    number: ${oldNumberMatch[1]}`;
		}
		if (oldStateMatch !== null) {
			githubLinksFrontmatter += `\n    state: "${oldStateMatch[1]}"`;
		}
		if (oldTitleMatch !== null) {
			githubLinksFrontmatter += `\n    title: "${oldTitleMatch[1]}"`;
		}
		if (oldLabelsMatch !== null) {
			githubLinksFrontmatter += `\n    labels: [${oldLabelsMatch[1]}]`;
		}
		if (oldFetchedMatch !== null) {
			githubLinksFrontmatter += `\n    lastFetched: "${oldFetchedMatch[1]}"`;
		}
	}

	return appendBeforeFrontmatterClose(migrated, githubLinksFrontmatter);
}

export function updateFrontmatterWithGitHubLink(
	content: string,
	githubUrl: string,
	storedMetadata: GitHubStoredMetadata | undefined
): string {
	const frontmatterCloseIndex = getFrontmatterCloseIndex(content);
	if (frontmatterCloseIndex === -1) {
		return content;
	}

	const frontmatterSection = content.slice(0, frontmatterCloseIndex);
	const hasGithubLinks = frontmatterSection.includes('github_links:');
	const hasOldGithub =
		frontmatterSection.match(/^github:\s*$/m) !== null ||
		frontmatterSection.match(/^github:\s*\n\s+url:/m) !== null;

	if (hasGithubLinks) {
		const newEntry = buildGitHubFrontmatterEntry(githubUrl, storedMetadata);
		return appendBeforeFrontmatterClose(content, newEntry);
	}

	if (hasOldGithub) {
		const migrated = migrateOldGitHubFormat(content, frontmatterSection);
		const newEntry = buildGitHubFrontmatterEntry(githubUrl, storedMetadata);
		return appendBeforeFrontmatterClose(migrated, newEntry);
	}

	const githubLinksFrontmatter =
		'\ngithub_links:' + buildGitHubFrontmatterEntry(githubUrl, storedMetadata);
	return appendBeforeFrontmatterClose(content, githubLinksFrontmatter);
}

export function updateBodyWithGitHubLink(
	content: string,
	githubUrl: string,
	storedMetadata: GitHubStoredMetadata | undefined,
	dashboardId: string
): string {
	const linkText = formatGitHubLinkText(githubUrl, storedMetadata);
	const githubBlock =
		`[${linkText}](${githubUrl})\n\n` +
		'```tasks-dashboard-github\n' +
		`url: ${githubUrl}\n` +
		`dashboard: ${dashboardId}\n` +
		'```\n';

	const tasksSeparatorIndex = content.indexOf('\n---\n## Tasks');
	if (tasksSeparatorIndex !== -1) {
		return (
			content.slice(0, tasksSeparatorIndex) +
			'\n' +
			githubBlock +
			content.slice(tasksSeparatorIndex)
		);
	}
	return content;
}

export function removeGitHubLinkFromIssueContent(content: string, githubUrl: string): string {
	const frontmatterCloseIndex = getFrontmatterCloseIndex(content);
	if (frontmatterCloseIndex !== -1) {
		const frontmatter = content.slice(0, frontmatterCloseIndex);
		const afterFrontmatter = content.slice(frontmatterCloseIndex);

		const entryPattern = new RegExp(
			`\\n  - url: "${escapeForRegExp(githubUrl)}"` +
				`(?:\\n    [a-zA-Z][a-zA-Z_]*:.*)*`,
			'g'
		);
		let cleanedFrontmatter = frontmatter.replace(entryPattern, '');

		if (
			cleanedFrontmatter.includes('github_links:') &&
			!/github_links:\s*\n\s+-/.test(cleanedFrontmatter)
		) {
			cleanedFrontmatter = cleanedFrontmatter.replace(/\ngithub_links:\s*/, '');
		}

		content = cleanedFrontmatter + afterFrontmatter;
	}

	const escapedUrl = escapeForRegExp(githubUrl);
	const bodyLinkPattern = new RegExp(
		`\\n?\\[([^\\]]*?)\\]\\(${escapedUrl}\\)\\s*\\n\\n\`\`\`tasks-dashboard-github\\nurl: ${escapedUrl}\\ndashboard: [^\\n]+\\n\`\`\``,
		'g'
	);
	return content.replace(bodyLinkPattern, '');
}

export function removeGitHubLinkFromDashboardIssueBlock(
	block: string,
	githubUrl: string
): string {
	const escapedUrl = escapeForRegExp(githubUrl);
	return block.replace(new RegExp(`\\ngithub_link: ${escapedUrl}`, 'g'), '');
}

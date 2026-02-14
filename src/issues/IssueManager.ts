import { App, Notice, TFile } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import {
	DashboardConfig,
	Priority,
	Issue,
	IssueStatus,
	GitHubIssueMetadata,
	GitHubStoredMetadata
} from '../types';
import { slugify } from '../utils/slugify';
import { getDashboardPath } from '../utils/dashboard-path';
import { isGitHubRepoUrl, parseGitHubRepoFullName } from '../utils/github-url';
import { parseGitHubUrlInfo } from '../utils/github';

export interface CreateIssueParams {
	name: string;
	priority: Priority;
	githubLink?: string;
	githubMetadata?: GitHubIssueMetadata;
	dashboard: DashboardConfig;
}

export interface ImportNoteParams {
	file: TFile;
	priority: Priority;
	dashboard: DashboardConfig;
}

export interface IssueManagerInstance {
	createIssue: (params: CreateIssueParams) => Promise<Issue>;
	importNoteAsIssue: (params: ImportNoteParams) => Promise<Issue>;
	archiveIssue: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	unarchiveIssue: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	deleteIssue: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	renameIssue: (dashboard: DashboardConfig, oldIssueId: string, newName: string) => Promise<void>;
	addGitHubLink: (
		dashboard: DashboardConfig,
		issueId: string,
		githubUrl: string,
		metadata?: GitHubIssueMetadata
	) => Promise<void>;
	removeGitHubLink: (
		dashboard: DashboardConfig,
		issueId: string,
		githubUrl: string
	) => Promise<void>;
}

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

function buildGitHubMetadataYaml(metadata: GitHubStoredMetadata, indent: string = '    '): string {
	let yaml = '';
	yaml += `\n${indent}number: ${metadata.number}`;
	yaml += `\n${indent}state: "${metadata.state}"`;
	yaml += `\n${indent}title: "${metadata.title.replace(/"/g, '\\"')}"`;
	yaml += `\n${indent}labels: [${metadata.labels.map((l) => `"${l}"`).join(', ')}]`;
	yaml += `\n${indent}lastFetched: "${metadata.lastFetched}"`;
	return yaml;
}

function findIssueFilesByPath(app: App, basePath: string, issueId: string): TFile[] {
	return app.vault
		.getFiles()
		.filter((f) => f.path.startsWith(basePath) && f.basename.startsWith(issueId));
}

export function createIssueManager(app: App, plugin: TasksDashboardPlugin): IssueManagerInstance {
	const activeOperationLocks = new Set<string>();

	const acquireOperationLock = (dashboardId: string, issueId: string): boolean => {
		const lockKey = `${dashboardId}:${issueId}`;
		if (activeOperationLocks.has(lockKey)) {
			return false;
		}
		activeOperationLocks.add(lockKey);
		return true;
	};

	const releaseOperationLock = (dashboardId: string, issueId: string): void => {
		activeOperationLocks.delete(`${dashboardId}:${issueId}`);
	};

	const ensureFolderExists = async (path: string): Promise<void> => {
		const folder = app.vault.getAbstractFileByPath(path);
		if (folder === null) {
			await app.vault.createFolder(path);
		}
	};

	const generateUniqueFilePath = (basePath: string, slug: string): string => {
		let candidate = `${basePath}/${slug}.md`;
		let counter = 1;
		while (app.vault.getAbstractFileByPath(candidate) !== null) {
			candidate = `${basePath}/${slug}-${counter}.md`;
			counter++;
		}
		return candidate;
	};

	const generateGithubLinksFrontmatter = (
		links: string[],
		metadataList: GitHubStoredMetadata[]
	): string => {
		if (links.length === 0) {
			return '';
		}
		let yaml = '\ngithub_links:';
		for (let index = 0; index < links.length; index++) {
			const url = links[index];
			const metadata: GitHubStoredMetadata | undefined = metadataList[index] as
				| GitHubStoredMetadata
				| undefined;
			yaml += `\n  - url: "${url}"`;
			if (metadata !== undefined) {
				yaml += buildGitHubMetadataYaml(metadata);
			}
		}
		return yaml;
	};

	const generateGithubLinksBody = (
		links: string[],
		metadataList: GitHubStoredMetadata[],
		dashboardId: string
	): string => {
		let body = '';
		for (let index = 0; index < links.length; index++) {
			const url = links[index];
			const metadata: GitHubStoredMetadata | undefined = metadataList[index] as
				| GitHubStoredMetadata
				| undefined;
			const linkText = formatGitHubLinkText(url, metadata);
			body += `\n[${linkText}](${url})

\`\`\`tasks-dashboard-github
url: ${url}
dashboard: ${dashboardId}
\`\`\``;
		}
		return body;
	};

	const generateIssueContent = (issue: Issue, dashboard: DashboardConfig): string => {
		const filename = dashboard.dashboardFilename || 'Dashboard.md';
		const relativePath = '../'.repeat(2) + encodeURI(filename);

		// Collect links and metadata from both old and new fields
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
	};

	const createIssue = async (params: CreateIssueParams): Promise<Issue> => {
		const { name, priority, githubLink, githubMetadata, dashboard } = params;
		const issueId = slugify(name);
		const activePath = `${dashboard.rootPath}/Issues/Active`;

		await ensureFolderExists(activePath);

		const filePath = generateUniqueFilePath(activePath, issueId);
		const created = new Date().toISOString();

		let storedMetadata: GitHubStoredMetadata | undefined;
		if (githubMetadata !== undefined) {
			storedMetadata = {
				url: githubMetadata.url,
				number: githubMetadata.number,
				state: githubMetadata.state,
				title: githubMetadata.title,
				labels: githubMetadata.labels.map((l) => l.name),
				lastFetched: new Date().toISOString()
			};
		}

		const githubLinks = githubLink !== undefined && githubLink !== '' ? [githubLink] : [];
		const githubMetadataList = storedMetadata !== undefined ? [storedMetadata] : [];

		const issue: Issue = {
			id: issueId,
			name,
			priority,
			status: 'active',
			created,
			githubLink,
			githubMetadata: storedMetadata,
			githubLinks,
			githubMetadataList,
			filePath
		};

		const content = generateIssueContent(issue, dashboard);
		await app.vault.create(filePath, content);
		await plugin.dashboardWriter.addIssueToDashboard(dashboard, issue);

		return issue;
	};

	const importNoteAsIssue = async (params: ImportNoteParams): Promise<Issue> => {
		const { file, priority, dashboard } = params;
		const name = file.basename;
		const issueId = slugify(name);
		const activePath = `${dashboard.rootPath}/Issues/Active`;

		await ensureFolderExists(activePath);

		const filePath = generateUniqueFilePath(activePath, issueId);
		const created = new Date().toISOString();
		const dashboardFilename = dashboard.dashboardFilename || 'Dashboard.md';
		const relativePath = '../'.repeat(2) + encodeURI(dashboardFilename);

		// Read original note content — original stays untouched
		const originalContent = await app.vault.read(file);

		// Extract and merge frontmatter from original
		let originalBody = originalContent;
		let originalFrontmatterFields = '';
		const frontmatterMatch = originalContent.match(/^---\n([\s\S]*?)\n---/);
		if (frontmatterMatch !== null) {
			const originalFields = frontmatterMatch[1];
			// Filter out fields we'll set ourselves
			const ownFields = new Set(['created', 'status', 'priority']);
			const preservedLines = originalFields
				.split('\n')
				.filter((line) => {
					const key = line.match(/^(\w+):/);
					return key === null || !ownFields.has(key[1]);
				})
				.join('\n');
			if (preservedLines.trim() !== '') {
				originalFrontmatterFields = '\n' + preservedLines;
			}
			originalBody = originalContent.slice(frontmatterMatch[0].length).trimStart();
		}

		const newContent = `---
created: ${created}
status: active
priority: ${priority}${originalFrontmatterFields}
---
[← Back to Dashboard](${relativePath})

${originalBody}`;

		await app.vault.create(filePath, newContent);

		const issue: Issue = {
			id: issueId,
			name,
			priority,
			status: 'active',
			created,
			githubLinks: [],
			githubMetadataList: [],
			filePath
		};

		await plugin.dashboardWriter.addIssueToDashboard(dashboard, issue);

		return issue;
	};

	const findIssueFile = (
		dashboard: DashboardConfig,
		issueId: string
	): { file: TFile; status: IssueStatus } | null => {
		const activePath = `${dashboard.rootPath}/Issues/Active`;
		const archivePath = `${dashboard.rootPath}/Issues/Archive`;

		const activeFiles = findIssueFilesByPath(app, activePath, issueId);
		if (activeFiles.length > 0) {
			return { file: activeFiles[0], status: 'active' };
		}

		const archiveFiles = findIssueFilesByPath(app, archivePath, issueId);
		if (archiveFiles.length > 0) {
			return { file: archiveFiles[0], status: 'archived' };
		}

		return null;
	};

	const archiveIssue = async (dashboard: DashboardConfig, issueId: string): Promise<void> => {
		if (!acquireOperationLock(dashboard.id, issueId)) {
			new Notice(`Operation already in progress for ${issueId}`);
			return;
		}

		try {
			const activePath = `${dashboard.rootPath}/Issues/Active`;
			const archivePath = `${dashboard.rootPath}/Issues/Archive`;

			await ensureFolderExists(archivePath);

			const activeFiles = findIssueFilesByPath(app, activePath, issueId);
			if (activeFiles.length === 0) {
				throw new Error(`Issue not found: ${issueId}`);
			}

			const file = activeFiles[0];
			let content = await app.vault.read(file);

			content = content.replace(/^status:\s*active/m, 'status: archived');
			await app.vault.modify(file, content);

			const newPath = `${archivePath}/${file.name}`;
			await app.vault.rename(file, newPath);
			await plugin.dashboardWriter.moveIssueToArchive(dashboard, issueId);

			new Notice(`Archived: ${issueId}`);
		} finally {
			releaseOperationLock(dashboard.id, issueId);
		}
	};

	const unarchiveIssue = async (dashboard: DashboardConfig, issueId: string): Promise<void> => {
		if (!acquireOperationLock(dashboard.id, issueId)) {
			new Notice(`Operation already in progress for ${issueId}`);
			return;
		}

		try {
			const activePath = `${dashboard.rootPath}/Issues/Active`;
			const archivePath = `${dashboard.rootPath}/Issues/Archive`;

			await ensureFolderExists(activePath);

			const archiveFiles = findIssueFilesByPath(app, archivePath, issueId);
			if (archiveFiles.length === 0) {
				throw new Error(`Issue not found: ${issueId}`);
			}

			const file = archiveFiles[0];
			let content = await app.vault.read(file);

			content = content.replace(/^status:\s*archived/m, 'status: active');
			await app.vault.modify(file, content);

			const newPath = `${activePath}/${file.name}`;
			await app.vault.rename(file, newPath);
			await plugin.dashboardWriter.moveIssueToActive(dashboard, issueId);

			new Notice(`Unarchived: ${issueId}`);
		} finally {
			releaseOperationLock(dashboard.id, issueId);
		}
	};

	const deleteIssue = async (dashboard: DashboardConfig, issueId: string): Promise<void> => {
		const issueFile = findIssueFile(dashboard, issueId);
		if (issueFile === null) {
			throw new Error(`Issue not found: ${issueId}`);
		}
		const { file } = issueFile;

		await plugin.dashboardWriter.removeIssueFromDashboard(dashboard, issueId);

		// Use system trash for recoverability
		await app.vault.trash(file, true);

		let settingsChanged = false;
		if (issueId in plugin.settings.collapsedIssues) {
			delete plugin.settings.collapsedIssues[issueId];
			settingsChanged = true;
		}
		if (issueId in plugin.settings.issueColors) {
			delete plugin.settings.issueColors[issueId];
			settingsChanged = true;
		}
		if (settingsChanged) {
			void plugin.saveSettings();
		}

		new Notice(`Deleted: ${issueId}`);
	};

	const renameIssue = async (
		dashboard: DashboardConfig,
		oldIssueId: string,
		newName: string
	): Promise<void> => {
		const newIssueId = slugify(newName);

		if (newIssueId === oldIssueId) {
			return;
		}

		const issueResult = findIssueFile(dashboard, oldIssueId);
		if (issueResult === null) {
			throw new Error(`Issue not found: ${oldIssueId}`);
		}

		const { file, status } = issueResult;
		const folder = status === 'active' ? 'Active' : 'Archive';
		const newPath = `${dashboard.rootPath}/Issues/${folder}/${newIssueId}.md`;

		if (app.vault.getAbstractFileByPath(newPath) !== null) {
			throw new Error(`An issue with name "${newName}" already exists`);
		}

		// Update dashboard file — replace within the issue's block only
		const dashboardPath = getDashboardPath(dashboard);
		const dashboardFile = app.vault.getAbstractFileByPath(dashboardPath) as TFile | null;

		if (dashboardFile !== null) {
			let content = await app.vault.read(dashboardFile);
			const startMarker = `%% ISSUE:${oldIssueId}:START %%`;
			const endMarker = `%% ISSUE:${oldIssueId}:END %%`;
			const startIndex = content.indexOf(startMarker);
			const endIndex = content.indexOf(endMarker);

			if (startIndex !== -1 && endIndex !== -1) {
				const blockEnd = endIndex + endMarker.length;
				let block = content.substring(startIndex, blockEnd);

				block = block.replace(`%% ISSUE:${oldIssueId}:START %%`, `%% ISSUE:${newIssueId}:START %%`);
				block = block.replace(`%% ISSUE:${oldIssueId}:END %%`, `%% ISSUE:${newIssueId}:END %%`);
				block = block.replace(`issue: ${oldIssueId}`, `issue: ${newIssueId}`);
				block = block.replace(/name: .+/, `name: ${newName}`);
				block = block.replace(`path: ${file.path}`, `path: ${newPath}`);
				block = block.replace(
					`path includes Issues/${folder}/${oldIssueId}`,
					`path includes Issues/${folder}/${newIssueId}`
				);

				content = content.slice(0, startIndex) + block + content.slice(blockEnd);
				await app.vault.modify(dashboardFile, content);
			}
		}

		// Update issue file H1
		let issueContent = await app.vault.read(file);
		issueContent = issueContent.replace(/^(# ).+$/m, `$1${newName}`);
		await app.vault.modify(file, issueContent);

		// Rename file
		await app.vault.rename(file, newPath);

		// Migrate collapsed state
		if (oldIssueId in plugin.settings.collapsedIssues) {
			plugin.settings.collapsedIssues[newIssueId] = plugin.settings.collapsedIssues[oldIssueId];
			delete plugin.settings.collapsedIssues[oldIssueId];
		}

		// Migrate header color
		if (oldIssueId in plugin.settings.issueColors) {
			plugin.settings.issueColors[newIssueId] = plugin.settings.issueColors[oldIssueId];
			delete plugin.settings.issueColors[oldIssueId];
		}

		void plugin.saveSettings();
		new Notice(`Renamed: ${oldIssueId} → ${newIssueId}`);
	};

	const migrateOldGitHubFormat = (content: string, frontmatterSection: string): string => {
		const oldGithubMatch = frontmatterSection.match(/^github:\s*\n((?:\s+\w+:.*\n?)*)/m);
		if (oldGithubMatch === null) {
			return content;
		}

		const oldUrlMatch = oldGithubMatch[0].match(/url:\s*"?([^"\n]+)"?/);
		const oldUrl = oldUrlMatch !== null ? oldUrlMatch[1].trim() : undefined;

		// Remove old github: block
		let migrated = content.replace(oldGithubMatch[0], '');

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

		const newCloseIndex = migrated.indexOf('---', migrated.indexOf('---') + 3);
		migrated =
			migrated.slice(0, newCloseIndex) +
			githubLinksFrontmatter +
			'\n' +
			migrated.slice(newCloseIndex);

		return migrated;
	};

	const updateFrontmatterWithGitHubLink = (
		content: string,
		githubUrl: string,
		storedMetadata: GitHubStoredMetadata | undefined
	): string => {
		const frontmatterCloseIndex = content.indexOf('---', content.indexOf('---') + 3);
		if (frontmatterCloseIndex === -1) {
			return content;
		}

		const frontmatterSection = content.slice(0, frontmatterCloseIndex);
		const hasGithubLinks = frontmatterSection.includes('github_links:');
		const hasOldGithub =
			frontmatterSection.match(/^github:\s*$/m) !== null ||
			frontmatterSection.match(/^github:\s*\n\s+url:/m) !== null;

		if (hasGithubLinks) {
			let newEntry = `\n  - url: "${githubUrl}"`;
			if (storedMetadata !== undefined) {
				newEntry += buildGitHubMetadataYaml(storedMetadata);
			}
			return (
				content.slice(0, frontmatterCloseIndex) +
				newEntry +
				'\n' +
				content.slice(frontmatterCloseIndex)
			);
		}

		if (hasOldGithub) {
			let migrated = migrateOldGitHubFormat(content, frontmatterSection);
			// Now append the new link to the migrated github_links
			const migratedCloseIndex = migrated.indexOf('---', migrated.indexOf('---') + 3);
			let newEntry = `\n  - url: "${githubUrl}"`;
			if (storedMetadata !== undefined) {
				newEntry += buildGitHubMetadataYaml(storedMetadata);
			}
			migrated =
				migrated.slice(0, migratedCloseIndex) +
				newEntry +
				'\n' +
				migrated.slice(migratedCloseIndex);
			return migrated;
		}

		// No existing github data — create fresh github_links
		let githubLinksFrontmatter = `\ngithub_links:\n  - url: "${githubUrl}"`;
		if (storedMetadata !== undefined) {
			githubLinksFrontmatter += buildGitHubMetadataYaml(storedMetadata);
		}
		return (
			content.slice(0, frontmatterCloseIndex) +
			githubLinksFrontmatter +
			'\n' +
			content.slice(frontmatterCloseIndex)
		);
	};

	const updateBodyWithGitHubLink = (
		content: string,
		githubUrl: string,
		storedMetadata: GitHubStoredMetadata | undefined,
		dashboardId: string
	): string => {
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
	};

	const updateDashboardWithGitHubLink = async (
		dashboard: DashboardConfig,
		issueId: string,
		githubUrl: string
	): Promise<void> => {
		const dashboardFilename = dashboard.dashboardFilename || 'Dashboard.md';
		const dashboardPath = `${dashboard.rootPath}/${dashboardFilename}`;
		const dashboardFile = app.vault.getAbstractFileByPath(dashboardPath) as TFile | null;

		if (dashboardFile === null) {
			return;
		}

		let dashboardContent = await app.vault.read(dashboardFile);
		const startMarker = `%% ISSUE:${issueId}:START %%`;
		const endMarker = `%% ISSUE:${issueId}:END %%`;
		const startIndex = dashboardContent.indexOf(startMarker);
		const endIndex = dashboardContent.indexOf(endMarker);

		if (startIndex === -1 || endIndex === -1) {
			return;
		}

		const blockEnd = endIndex + endMarker.length;
		let block = dashboardContent.substring(startIndex, blockEnd);

		// Migrate any old `github:` line to `github_link:` while we're here
		block = block.replace(/^github: (.+)$/m, 'github_link: $1');

		// Insert github_link: url before the closing ``` of tasks-dashboard-controls
		const controlsBlockEnd = block.indexOf('```\n');
		if (controlsBlockEnd !== -1) {
			block =
				block.slice(0, controlsBlockEnd) +
				`github_link: ${githubUrl}\n` +
				block.slice(controlsBlockEnd);
		}

		dashboardContent =
			dashboardContent.slice(0, startIndex) + block + dashboardContent.slice(blockEnd);
		await app.vault.modify(dashboardFile, dashboardContent);
	};

	const addGitHubLink = async (
		dashboard: DashboardConfig,
		issueId: string,
		githubUrl: string,
		metadata?: GitHubIssueMetadata
	): Promise<void> => {
		const issueResult = findIssueFile(dashboard, issueId);
		if (issueResult === null) {
			throw new Error(`Issue not found: ${issueId}`);
		}

		const { file } = issueResult;
		let content = await app.vault.read(file);

		// Build stored metadata for frontmatter
		let storedMetadata: GitHubStoredMetadata | undefined;
		if (metadata !== undefined) {
			storedMetadata = {
				url: metadata.url,
				number: metadata.number,
				state: metadata.state,
				title: metadata.title,
				labels: metadata.labels.map((l) => l.name),
				lastFetched: new Date().toISOString()
			};
		}

		content = updateFrontmatterWithGitHubLink(content, githubUrl, storedMetadata);
		content = updateBodyWithGitHubLink(content, githubUrl, storedMetadata, dashboard.id);

		await app.vault.modify(file, content);
		await updateDashboardWithGitHubLink(dashboard, issueId, githubUrl);

		new Notice(`GitHub link added to ${issueId}`);
	};

	const removeGitHubLink = async (
		dashboard: DashboardConfig,
		issueId: string,
		githubUrl: string
	): Promise<void> => {
		const issueResult = findIssueFile(dashboard, issueId);
		if (issueResult === null) {
			throw new Error(`Issue not found: ${issueId}`);
		}

		const { file } = issueResult;
		let content = await app.vault.read(file);

		// --- Remove from frontmatter ---
		const frontmatterCloseIndex = content.indexOf('---', content.indexOf('---') + 3);
		if (frontmatterCloseIndex !== -1) {
			const frontmatter = content.slice(0, frontmatterCloseIndex);
			const afterFrontmatter = content.slice(frontmatterCloseIndex);

			// Match the `- url: "{url}"` entry and its metadata children
			const entryPattern = new RegExp(
				`\\n  - url: "${githubUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"` +
				`(?:\\n    [a-zA-Z][a-zA-Z_]*:.*)*`,
				'g'
			);
			let cleanedFrontmatter = frontmatter.replace(entryPattern, '');

			// If no entries remain under github_links:, remove the key entirely
			if (cleanedFrontmatter.includes('github_links:') &&
				!/github_links:\s*\n\s+-/.test(cleanedFrontmatter)) {
				cleanedFrontmatter = cleanedFrontmatter.replace(/\ngithub_links:\s*/, '');
			}

			content = cleanedFrontmatter + afterFrontmatter;
		}

		// --- Remove markdown link + code block from body ---
		// Pattern: [linkText](url)\n\n```tasks-dashboard-github\nurl: {url}\ndashboard: ...\n```
		const escapedUrl = githubUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const bodyLinkPattern = new RegExp(
			`\\n?\\[([^\\]]*?)\\]\\(${escapedUrl}\\)\\s*\\n\\n\`\`\`tasks-dashboard-github\\nurl: ${escapedUrl}\\ndashboard: [^\\n]+\\n\`\`\``,
			'g'
		);
		content = content.replace(bodyLinkPattern, '');

		await app.vault.modify(file, content);

		// --- Remove from Dashboard.md ---
		const dashboardFilename = dashboard.dashboardFilename || 'Dashboard.md';
		const dashboardPath = `${dashboard.rootPath}/${dashboardFilename}`;
		const dashboardFile = app.vault.getAbstractFileByPath(dashboardPath) as TFile | null;

		if (dashboardFile !== null) {
			let dashboardContent = await app.vault.read(dashboardFile);
			const startMarker = `%% ISSUE:${issueId}:START %%`;
			const endMarker = `%% ISSUE:${issueId}:END %%`;
			const startIndex = dashboardContent.indexOf(startMarker);
			const endIndex = dashboardContent.indexOf(endMarker);

			if (startIndex !== -1 && endIndex !== -1) {
				const blockEnd = endIndex + endMarker.length;
				let block = dashboardContent.substring(startIndex, blockEnd);

				// Remove the github_link: {url} line
				block = block.replace(
					new RegExp(`\\ngithub_link: ${escapedUrl}`, 'g'),
					''
				);

				dashboardContent =
					dashboardContent.slice(0, startIndex) + block + dashboardContent.slice(blockEnd);
				await app.vault.modify(dashboardFile, dashboardContent);
			}
		}

		new Notice(`GitHub link removed from ${issueId}`);
	};

	return { createIssue, importNoteAsIssue, archiveIssue, unarchiveIssue, deleteIssue, renameIssue, addGitHubLink, removeGitHubLink };
}

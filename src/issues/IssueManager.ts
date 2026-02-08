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

export interface CreateIssueParams {
	name: string;
	priority: Priority;
	githubLink?: string;
	githubMetadata?: GitHubIssueMetadata;
	dashboard: DashboardConfig;
}

export interface IssueManagerInstance {
	createIssue: (params: CreateIssueParams) => Promise<Issue>;
	archiveIssue: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	unarchiveIssue: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
	deleteIssue: (dashboard: DashboardConfig, issueId: string) => Promise<void>;
}

export function createIssueManager(app: App, plugin: TasksDashboardPlugin): IssueManagerInstance {
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

	const generateIssueContent = (issue: Issue, dashboard: DashboardConfig): string => {
		const filename = dashboard.dashboardFilename || 'Dashboard.md';
		const relativePath = '../'.repeat(2) + encodeURI(filename);

		let frontmatter = `---
created: ${issue.created}
status: ${issue.status}
priority: ${issue.priority}`;

		if (issue.githubMetadata !== undefined) {
			frontmatter += `
github:
  url: "${issue.githubMetadata.url}"
  number: ${issue.githubMetadata.number}
  state: "${issue.githubMetadata.state}"
  title: "${issue.githubMetadata.title.replace(/"/g, '\\"')}"
  labels: [${issue.githubMetadata.labels.map((l) => `"${l}"`).join(', ')}]
  lastFetched: "${new Date().toISOString()}"`;
		}

		frontmatter += `
---`;

		let content = `${frontmatter}
[← Back to Dashboard](${relativePath})
# ${issue.name}`;

		if (issue.githubLink !== undefined && issue.githubLink !== '') {
			content += `
[GitHub Issue](${issue.githubLink})`;
		}

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

		const issue: Issue = {
			id: issueId,
			name,
			priority,
			status: 'active',
			created,
			githubLink,
			githubMetadata: storedMetadata,
			filePath
		};

		const content = generateIssueContent(issue, dashboard);
		await app.vault.create(filePath, content);
		await plugin.dashboardWriter.addIssueToDashboard(dashboard, issue);

		return issue;
	};

	const findIssueFile = (
		dashboard: DashboardConfig,
		issueId: string
	): { file: TFile; status: IssueStatus } | null => {
		const activePath = `${dashboard.rootPath}/Issues/Active`;
		const archivePath = `${dashboard.rootPath}/Issues/Archive`;

		const activeFiles = app.vault
			.getFiles()
			.filter((f) => f.path.startsWith(activePath) && f.basename.startsWith(issueId));

		if (activeFiles.length > 0) {
			return { file: activeFiles[0], status: 'active' };
		}

		const archiveFiles = app.vault
			.getFiles()
			.filter((f) => f.path.startsWith(archivePath) && f.basename.startsWith(issueId));

		if (archiveFiles.length > 0) {
			return { file: archiveFiles[0], status: 'archived' };
		}

		return null;
	};

	const archiveIssue = async (dashboard: DashboardConfig, issueId: string): Promise<void> => {
		const activePath = `${dashboard.rootPath}/Issues/Active`;
		const archivePath = `${dashboard.rootPath}/Issues/Archive`;

		await ensureFolderExists(archivePath);

		const activeFiles = app.vault
			.getFiles()
			.filter((f) => f.path.startsWith(activePath) && f.basename.startsWith(issueId));

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
	};

	const unarchiveIssue = async (dashboard: DashboardConfig, issueId: string): Promise<void> => {
		const activePath = `${dashboard.rootPath}/Issues/Active`;
		const archivePath = `${dashboard.rootPath}/Issues/Archive`;

		await ensureFolderExists(activePath);

		const archiveFiles = app.vault
			.getFiles()
			.filter((f) => f.path.startsWith(archivePath) && f.basename.startsWith(issueId));

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

		if (issueId in plugin.settings.collapsedIssues) {
			delete plugin.settings.collapsedIssues[issueId];
			void plugin.saveSettings();
		}

		new Notice(`Deleted: ${issueId}`);
	};

	return { createIssue, archiveIssue, unarchiveIssue, deleteIssue };
}

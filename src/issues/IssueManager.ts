import { App, Notice } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, Priority, Issue } from '../types';
import { slugify } from '../utils/slugify';

export interface CreateIssueParams {
	name: string;
	priority: Priority;
	githubLink?: string;
	dashboard: DashboardConfig;
}

export class IssueManager {
	private app: App;
	private plugin: TasksDashboardPlugin;

	constructor(app: App, plugin: TasksDashboardPlugin) {
		this.app = app;
		this.plugin = plugin;
	}

	async createIssue(params: CreateIssueParams): Promise<Issue> {
		const { name, priority, githubLink, dashboard } = params;
		const issueId = slugify(name);
		const activePath = `${dashboard.rootPath}/Issues/Active`;
		await this.ensureFolderExists(activePath);
		const filePath = this.generateUniqueFilePath(activePath, issueId);
		const created = new Date().toISOString();
		const issue: Issue = {
			id: issueId,
			name,
			priority,
			status: 'active',
			created,
			githubLink,
			filePath
		};
		const content = this.generateIssueContent(issue);
		await this.app.vault.create(filePath, content);
		await this.plugin.dashboardWriter.addIssueToDashboard(dashboard, issue);
		return issue;
	}

	async archiveIssue(dashboard: DashboardConfig, issueId: string): Promise<void> {
		const activePath = `${dashboard.rootPath}/Issues/Active`;
		const archivePath = `${dashboard.rootPath}/Issues/Archive`;
		await this.ensureFolderExists(archivePath);
		const activeFiles = this.app.vault
			.getFiles()
			.filter((f) => f.path.startsWith(activePath) && f.basename.startsWith(issueId));
		if (activeFiles.length === 0) {
			throw new Error(`Issue not found: ${issueId}`);
		}
		const file = activeFiles[0];
		let content = await this.app.vault.read(file);
		content = content.replace(/^status:\s*active/m, 'status: archived');
		await this.app.vault.modify(file, content);
		const newPath = `${archivePath}/${file.name}`;
		await this.app.vault.rename(file, newPath);
		await this.plugin.dashboardWriter.moveIssueToArchive(dashboard, issueId);
		new Notice(`Archived: ${issueId}`);
	}

	private generateIssueContent(issue: Issue): string {
		const relativePath = '../'.repeat(2) + 'Dashboard.md';
		let content = `---
created: ${issue.created}
status: ${issue.status}
priority: ${issue.priority}
---
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
	}

	private async ensureFolderExists(path: string): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(path);
		if (folder === null) {
			await this.app.vault.createFolder(path);
		}
	}

	private generateUniqueFilePath(basePath: string, slug: string): string {
		let candidate = `${basePath}/${slug}.md`;
		let counter = 1;
		while (this.app.vault.getAbstractFileByPath(candidate) !== null) {
			candidate = `${basePath}/${slug}-${counter}.md`;
			counter++;
		}
		return candidate;
	}
}

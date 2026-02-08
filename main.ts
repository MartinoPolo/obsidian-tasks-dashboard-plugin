import { Plugin, MarkdownView, TFile, Notice, FuzzySuggestModal } from 'obsidian';
import {
	TasksDashboardSettings,
	DEFAULT_SETTINGS,
	DashboardConfig,
	getDashboardDisplayName
} from './src/types';
import { TasksDashboardSettingTab } from './src/settings';
import { NamePromptModal } from './src/modals/IssueModal';
import { createIssueManager, type IssueManagerInstance } from './src/issues/IssueManager';
import { createProgressTracker, type ProgressTrackerInstance } from './src/issues/ProgressTracker';
import {
	createDashboardWriter,
	type DashboardWriterInstance
} from './src/dashboard/DashboardWriter';
import {
	createDashboardRenderer,
	type DashboardRendererInstance
} from './src/dashboard/DashboardRenderer';
import { initializeDashboardStructure } from './src/dashboard/DashboardParser';
import { createGitHubService, type GitHubServiceInstance } from './src/github/GitHubService';

export default class TasksDashboardPlugin extends Plugin {
	// The ! approach is idiomatic for Obsidian plugins where initialization happens in onload() rather than the constructor.
	settings!: TasksDashboardSettings;
	issueManager!: IssueManagerInstance;
	progressTracker!: ProgressTrackerInstance;
	dashboardWriter!: DashboardWriterInstance;
	dashboardRenderer!: DashboardRendererInstance;
	githubService!: GitHubServiceInstance;
	private registeredCommands: string[] = [];
	async onload() {
		await this.loadSettings();
		this.githubService = createGitHubService();
		this.githubService.setAuth(this.settings.githubAuth);
		this.issueManager = createIssueManager(this.app, this);
		this.progressTracker = createProgressTracker(this.app);
		this.dashboardWriter = createDashboardWriter(this.app, this);
		this.dashboardRenderer = createDashboardRenderer(this);
		this.registerMarkdownCodeBlockProcessor('tasks-dashboard-controls', (source, el, ctx) =>
			this.dashboardRenderer.render(source, el, ctx)
		);
		this.registerMarkdownCodeBlockProcessor('tasks-dashboard-sort', (source, el, ctx) =>
			this.dashboardRenderer.renderSortButton(source, el, ctx)
		);
		this.registerDashboardCommands();
		this.addSettingTab(new TasksDashboardSettingTab(this.app, this));
		this.addRibbonIcon('list-checks', 'Tasks Dashboard', () => {
			this.showDashboardSelector();
		});
		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				if (file !== null && this.isActiveIssueFile(file)) {
					setTimeout(() => {
						const view = this.app.workspace.getActiveViewOfType(MarkdownView);
						if (view?.editor) {
							const editor = view.editor;
							const lastLine = editor.lastLine();
							const lastLineLength = editor.getLine(lastLine).length;
							editor.setCursor({ line: lastLine, ch: lastLineLength });
						}
					}, 50);
				}
			})
		);
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (!(file instanceof TFile)) {
					return;
				}
				if (!this.isActiveIssueFile(file)) {
					return;
				}
				this.progressTracker.invalidateCache(file.path);
				this.rerenderDashboardViews();
			})
		);
	}

	private rerenderDashboardViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType('markdown')) {
			const view = leaf.view;
			if (!(view instanceof MarkdownView)) {
				continue;
			}
			const viewFile = view.file;
			if (viewFile === null || !this.isDashboardFile(viewFile)) {
				continue;
			}
			// Force re-render of preview mode code blocks (progress bars)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			(view as any).previewMode?.rerender(true);
		}
	}

	private isActiveIssueFile(file: TFile): boolean {
		return this.settings.dashboards.some((dashboard) =>
			file.path.startsWith(`${dashboard.rootPath}/Issues/Active/`)
		);
	}

	private isDashboardFile(file: TFile): boolean {
		return this.settings.dashboards.some((dashboard) => {
			const filename = dashboard.dashboardFilename || 'Dashboard.md';
			return file.path === `${dashboard.rootPath}/${filename}`;
		});
	}

	onunload() {
		for (const id of this.registeredCommands) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			(this.app as any).commands.removeCommand(id);
		}
	}

	registerDashboardCommands() {
		for (const id of this.registeredCommands) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			(this.app as any).commands.removeCommand(id);
		}
		this.registeredCommands = [];
		for (const dashboard of this.settings.dashboards) {
			const commandId = `tasks-dashboard:create-issue-${dashboard.id}`;
			const displayName = getDashboardDisplayName(dashboard);
			this.addCommand({
				id: `create-issue-${dashboard.id}`,
				name: `Create Issue: ${displayName}`,
				callback: () => {
					new NamePromptModal(this.app, this, dashboard).open();
				}
			});
			this.registeredCommands.push(commandId);
		}
		if (this.settings.dashboards.length > 0) {
			this.addCommand({
				id: 'create-issue-default',
				name: 'Create Issue (Select Dashboard)',
				hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'e' }],
				callback: () => {
					this.showDashboardSelector();
				}
			});
			this.registeredCommands.push('tasks-dashboard:create-issue-default');
		}
	}

	private showDashboardSelector() {
		if (this.settings.dashboards.length === 0) {
			new Notice('No dashboards configured. Please add one in settings.');
			return;
		}
		if (this.settings.dashboards.length === 1) {
			new NamePromptModal(this.app, this, this.settings.dashboards[0]).open();
			return;
		}
		const dashboards = this.settings.dashboards;
		const app = this.app;
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const pluginRef = this;
		class DashboardSelectorModal extends FuzzySuggestModal<DashboardConfig> {
			getItems(): DashboardConfig[] {
				return dashboards;
			}
			getItemText(item: DashboardConfig): string {
				return getDashboardDisplayName(item);
			}
			onChooseItem(item: DashboardConfig): void {
				new NamePromptModal(app, pluginRef, item).open();
			}
		}
		new DashboardSelectorModal(this.app).open();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<TasksDashboardSettings>
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async createDashboardFiles(dashboard: DashboardConfig): Promise<void> {
		const rootPath = dashboard.rootPath;
		if (rootPath === '') {
			throw new Error('Root path is required');
		}
		await this.ensureFolder(rootPath);
		await this.ensureFolder(`${rootPath}/Issues`);
		await this.ensureFolder(`${rootPath}/Issues/Active`);
		await this.ensureFolder(`${rootPath}/Issues/Archive`);
		const filename = dashboard.dashboardFilename || 'Dashboard.md';
		const dashboardPath = `${rootPath}/${filename}`;
		if (this.app.vault.getAbstractFileByPath(dashboardPath) === null) {
			const content = initializeDashboardStructure(dashboard.id);
			await this.app.vault.create(dashboardPath, content);
		}
	}

	private async ensureFolder(path: string): Promise<void> {
		if (this.app.vault.getAbstractFileByPath(path) === null) {
			await this.app.vault.createFolder(path);
		}
	}
}

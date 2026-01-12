import { Plugin, MarkdownView, TFile, Notice, FuzzySuggestModal } from 'obsidian';
import { TasksDashboardSettings, DEFAULT_SETTINGS, DashboardConfig } from './src/types';
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

export default class TasksDashboardPlugin extends Plugin {
	// The ! approach is idiomatic for Obsidian plugins where initialization happens in onload() rather than the constructor.
	settings!: TasksDashboardSettings;
	issueManager!: IssueManagerInstance;
	progressTracker!: ProgressTrackerInstance;
	dashboardWriter!: DashboardWriterInstance;
	dashboardRenderer!: DashboardRendererInstance;
	private registeredCommands: string[] = [];
	async onload() {
		await this.loadSettings();
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
			this.app.vault.on('modify', (file) => {
				if (file.path.includes('/Issues/')) {
					this.progressTracker.invalidateCache(file.path);
					this.autoRefreshDashboards();
				}
			})
		);
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
	}

	private isActiveIssueFile(file: TFile): boolean {
		return this.settings.dashboards.some((dashboard) =>
			file.path.startsWith(`${dashboard.rootPath}/Issues/Active/`)
		);
	}

	private refreshTimeout: number | undefined = undefined;

	private autoRefreshDashboards(): void {
		if (this.refreshTimeout !== undefined) {
			window.clearTimeout(this.refreshTimeout);
		}
		this.refreshTimeout = window.setTimeout(() => {
			this.app.workspace.iterateAllLeaves((leaf) => {
				if (leaf.view instanceof MarkdownView) {
					const file = leaf.view.file;
					if (file !== null && this.isDashboardFile(file)) {
						const view = leaf.view;
						const currentMode = view.getMode();
						void leaf.setViewState({
							type: 'markdown',
							state: { file: file.path, mode: currentMode }
						});
					}
				}
			});
		}, 500);
	}

	private isDashboardFile(file: TFile): boolean {
		return this.settings.dashboards.some(
			(dashboard) => file.path === `${dashboard.rootPath}/Dashboard.md`
		);
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
			this.addCommand({
				id: `create-issue-${dashboard.id}`,
				name: `Create Issue: ${dashboard.name}`,
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
				return item.name;
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
		const dashboardPath = `${rootPath}/Dashboard.md`;
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

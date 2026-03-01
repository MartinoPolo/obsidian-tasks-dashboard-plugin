import {
	Plugin,
	MarkdownView,
	TFile,
	Notice,
	FuzzySuggestModal,
	type Editor,
	type EditorPosition,
	type MarkdownPostProcessorContext,
	type App
} from 'obsidian';
import {
	TasksDashboardSettings,
	DEFAULT_SETTINGS,
	DashboardConfig,
	getDashboardDisplayName
} from './src/types';
import { TasksDashboardSettingTab } from './src/settings';
import { NamePromptModal } from './src/modals/issue-creation-modal';
import { createIssueManager, type IssueManagerInstance } from './src/issues/IssueManager';
import { createProgressTracker, type ProgressTrackerInstance } from './src/issues/ProgressTracker';
import {
	createDashboardWriter,
	type DashboardWriterInstance
} from './src/dashboard/DashboardWriter';
import {
	createDashboardRenderer,
	ReactiveRenderChild,
	type DashboardRendererInstance
} from './src/dashboard/DashboardRenderer';
import { initializeDashboardStructure } from './src/dashboard/DashboardParser';
import { createGitHubService, type GitHubServiceInstance } from './src/github/GitHubService';

const CURSOR_POSITION_DELAY_MS = 50;
const REFRESH_DEBOUNCE_MS = 500;

interface CommandManagerLike {
	removeCommand: (id: string) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const hasRemoveCommand = (value: unknown): value is CommandManagerLike => {
	return isRecord(value) && typeof value.removeCommand === 'function';
};

const removeRegisteredCommands = (app: App, commandIds: string[]): void => {
	const commandManager: unknown = Reflect.get(app, 'commands');
	if (!hasRemoveCommand(commandManager)) {
		return;
	}
	for (const commandId of commandIds) {
		commandManager.removeCommand(commandId);
	}
};

const sanitizeLoadedSettings = (loaded: unknown): Partial<TasksDashboardSettings> => {
	if (!isRecord(loaded)) {
		return {};
	}

	const sanitized: Partial<TasksDashboardSettings> = {
		...loaded
	};

	if ('dashboards' in sanitized && !Array.isArray(sanitized.dashboards)) {
		delete sanitized.dashboards;
	}
	if ('githubAuth' in sanitized && !isRecord(sanitized.githubAuth)) {
		delete sanitized.githubAuth;
	}
	if ('collapsedIssues' in sanitized && !isRecord(sanitized.collapsedIssues)) {
		delete sanitized.collapsedIssues;
	}
	if ('issueColors' in sanitized && !isRecord(sanitized.issueColors)) {
		delete sanitized.issueColors;
	}
	if ('issueFolders' in sanitized && !isRecord(sanitized.issueFolders)) {
		delete sanitized.issueFolders;
	}

	return sanitized;
};

const withDefaultGitHubEnabled = (dashboard: DashboardConfig): DashboardConfig => {
	const githubEnabledValue: unknown = Reflect.get(dashboard, 'githubEnabled');
	if (githubEnabledValue === undefined) {
		return {
			...dashboard,
			githubEnabled: true
		};
	}
	return dashboard;
};

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
		try {
			await this.loadSettings();
			this.githubService = createGitHubService();
			this.githubService.setAuth(this.settings.githubAuth);
			this.issueManager = createIssueManager(this.app, this);
			this.progressTracker = createProgressTracker(this.app);
			this.dashboardWriter = createDashboardWriter(this.app, this);
			this.dashboardRenderer = createDashboardRenderer(this);
			this.registerReactiveCodeBlockProcessor(
				'tasks-dashboard-controls',
				(source, el, ctx) => this.dashboardRenderer.render(source, el, ctx),
				'Failed to render dashboard controls',
				'Tasks Dashboard: render failed'
			);
			this.registerReactiveCodeBlockProcessor('tasks-dashboard-sort', (source, el, ctx) =>
				this.dashboardRenderer.renderSortButton(source, el, ctx)
			);
			this.registerReactiveCodeBlockProcessor(
				'tasks-dashboard-github',
				(source, el, ctx) => this.dashboardRenderer.renderGitHubNoteCard(source, el, ctx),
				'Failed to render GitHub card',
				'Tasks Dashboard: GitHub card render failed'
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
								const cursorPosition = this.findTasksSectionEnd(editor);
								editor.setCursor(cursorPosition);
							}
						}, CURSOR_POSITION_DELAY_MS);
					}
				})
			);
			let refreshDebounceTimer: ReturnType<typeof setTimeout> | undefined;
			const requestDashboardRefresh = (): void => {
				if (refreshDebounceTimer !== undefined) {
					clearTimeout(refreshDebounceTimer);
				}
				refreshDebounceTimer = setTimeout(() => {
					refreshDebounceTimer = undefined;
					this.triggerDashboardRefresh();
				}, REFRESH_DEBOUNCE_MS);
			};

			this.registerEvent(
				this.app.vault.on('modify', (file) => {
					if (!(file instanceof TFile)) {
						return;
					}
					if (!this.isActiveIssueFile(file)) {
						return;
					}
					this.progressTracker.invalidateCache(file.path);
					requestDashboardRefresh();
				})
			);

			this.registerEvent(
				this.app.workspace.on('css-change', () => {
					requestDashboardRefresh();
				})
			);
		} catch (error) {
			console.error('Tasks Dashboard: failed to initialize', error);
			new Notice('Tasks Dashboard: initialization failed. Check console for details.');
		}
	}

	triggerDashboardRefresh(): void {
		this.app.workspace.trigger('tasks-dashboard:refresh');
	}

	private registerReactiveCodeBlockProcessor(
		language: string,
		render: (
			source: string,
			el: HTMLElement,
			ctx: MarkdownPostProcessorContext
		) => void | Promise<void>,
		errorMessage?: string,
		errorLogPrefix?: string
	): void {
		this.registerMarkdownCodeBlockProcessor(language, (source, el, ctx) => {
			void Promise.resolve(render(source, el, ctx)).catch((error: unknown) => {
				if (errorLogPrefix !== undefined) {
					console.error(errorLogPrefix, error);
				}
				if (errorMessage !== undefined) {
					el.createEl('span', { text: errorMessage, cls: 'tdc-error' });
				}
			});

			ctx.addChild(new ReactiveRenderChild(el, source, ctx, this, (s, e, c) => render(s, e, c)));
		});
	}

	private isActiveIssueFile(file: TFile): boolean {
		return this.settings.dashboards.some((dashboard) =>
			file.path.startsWith(`${dashboard.rootPath}/Issues/Active/`)
		);
	}

	private findTasksSectionEnd(editor: Editor): EditorPosition {
		const TASK_LINE_PATTERN = /^[\s]*[-*]\s*\[([ xX])\]/;
		const HEADING_PATTERN = /^#{1,6}\s/;
		const totalLines = editor.lastLine();

		let tasksSectionStartLine: number | undefined = undefined;
		for (let lineIndex = 0; lineIndex <= totalLines; lineIndex++) {
			if (editor.getLine(lineIndex).trim() === '## Tasks') {
				tasksSectionStartLine = lineIndex;
				break;
			}
		}

		if (tasksSectionStartLine === undefined) {
			const lastLineContent = editor.getLine(totalLines);
			return { line: totalLines, ch: lastLineContent.length };
		}

		let lastTaskLineIndex = tasksSectionStartLine;
		for (let lineIndex = tasksSectionStartLine + 1; lineIndex <= totalLines; lineIndex++) {
			const lineContent = editor.getLine(lineIndex);

			// Stop at the next heading — we've left the Tasks section
			if (HEADING_PATTERN.test(lineContent)) {
				break;
			}

			if (TASK_LINE_PATTERN.test(lineContent)) {
				lastTaskLineIndex = lineIndex;
			}
		}

		const targetLineContent = editor.getLine(lastTaskLineIndex);
		return { line: lastTaskLineIndex, ch: targetLineContent.length };
	}

	onunload() {
		removeRegisteredCommands(this.app, this.registeredCommands);
	}

	registerDashboardCommands() {
		removeRegisteredCommands(this.app, this.registeredCommands);
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
		const loaded: unknown = await this.loadData();
		const validatedData = sanitizeLoadedSettings(loaded);
		const mergedSettings = Object.assign({}, DEFAULT_SETTINGS, validatedData);
		this.settings = {
			...mergedSettings,
			dashboards: mergedSettings.dashboards.map(withDefaultGitHubEnabled)
		};
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

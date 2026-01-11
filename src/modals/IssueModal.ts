import { App, Modal, Notice, SuggestModal, TFile, MarkdownView } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, Priority } from '../types';
// Step 1: Name Prompt - Simple text input modal positioned at top
export class NamePromptModal extends Modal {
    private plugin: TasksDashboardPlugin;
    private dashboard: DashboardConfig;
    private input: HTMLInputElement;
    constructor(app: App, plugin: TasksDashboardPlugin, dashboard: DashboardConfig) {
        super(app);
        this.plugin = plugin;
        this.dashboard = dashboard;
    }
    onOpen() {
        const { contentEl, modalEl, containerEl } = this;
        containerEl.addClass('tdc-top-modal');
        modalEl.addClass('tdc-prompt-modal');
        contentEl.empty();
        const title = contentEl.createEl('div', { cls: 'tdc-prompt-title', text: 'Issue Name' });
        this.input = contentEl.createEl('input', {
            type: 'text',
            cls: 'tdc-prompt-input',
            attr: { placeholder: 'Enter issue name...' }
        });
        this.input.focus();
        const btnContainer = contentEl.createDiv({ cls: 'tdc-prompt-buttons' });
        const confirmBtn = btnContainer.createEl('button', { cls: 'tdc-prompt-btn tdc-prompt-btn-confirm' });
        confirmBtn.innerHTML = 'Confirm <kbd>↵</kbd>';
        confirmBtn.addEventListener('click', () => this.confirm());
        const cancelBtn = btnContainer.createEl('button', { cls: 'tdc-prompt-btn tdc-prompt-btn-cancel' });
        cancelBtn.innerHTML = 'Cancel <kbd>Esc</kbd>';
        cancelBtn.addEventListener('click', () => this.close());
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.confirm();
            }
        });
    }
    private confirm() {
        const value = this.input.value.trim();
        if (value) {
            this.close();
            new PriorityPromptModal(this.app, this.plugin, this.dashboard, value).open();
        } else {
            this.input.addClass('tdc-input-error');
            this.input.focus();
        }
    }
    onClose() {
        this.contentEl.empty();
    }
}
// Step 2: Priority Prompt - SuggestModal (already positions at top)
class PriorityPromptModal extends SuggestModal<Priority> {
    private plugin: TasksDashboardPlugin;
    private dashboard: DashboardConfig;
    private issueName: string;
    constructor(app: App, plugin: TasksDashboardPlugin, dashboard: DashboardConfig, issueName: string) {
        super(app);
        this.plugin = plugin;
        this.dashboard = dashboard;
        this.issueName = issueName;
        this.setPlaceholder('Select priority');
    }
    onOpen() {
        super.onOpen();
        // Simulate ArrowDown to properly select medium (index 1)
        setTimeout(() => {
            const event = new KeyboardEvent('keydown', {
                key: 'ArrowDown',
                code: 'ArrowDown',
                bubbles: true
            });
            this.inputEl.dispatchEvent(event);
        }, 0);
    }
    getSuggestions(): Priority[] {
        return ['low', 'medium', 'high', 'top'];
    }
    renderSuggestion(priority: Priority, el: HTMLElement) {
        const container = el.createDiv({ cls: 'tdc-priority-suggestion' });
        container.createSpan({ cls: `tdc-priority-dot priority-${priority}` });
        container.createSpan({ text: priority.charAt(0).toUpperCase() + priority.slice(1) });
    }
    onChooseSuggestion(priority: Priority) {
        new GithubPromptModal(this.app, this.plugin, this.dashboard, this.issueName, priority).open();
    }
}
// Step 3: GitHub Link Prompt - Simple text input modal positioned at top
class GithubPromptModal extends Modal {
    private plugin: TasksDashboardPlugin;
    private dashboard: DashboardConfig;
    private issueName: string;
    private priority: Priority;
    private input: HTMLInputElement;
    constructor(app: App, plugin: TasksDashboardPlugin, dashboard: DashboardConfig, issueName: string, priority: Priority) {
        super(app);
        this.plugin = plugin;
        this.dashboard = dashboard;
        this.issueName = issueName;
        this.priority = priority;
    }
    onOpen() {
        const { contentEl, modalEl, containerEl } = this;
        containerEl.addClass('tdc-top-modal');
        modalEl.addClass('tdc-prompt-modal');
        contentEl.empty();
        const title = contentEl.createEl('div', { cls: 'tdc-prompt-title', text: 'GitHub Link (optional)' });
        this.input = contentEl.createEl('input', {
            type: 'text',
            cls: 'tdc-prompt-input',
            attr: { placeholder: 'https://github.com/... (or leave empty)' }
        });
        this.input.focus();
        const btnContainer = contentEl.createDiv({ cls: 'tdc-prompt-buttons' });
        const confirmBtn = btnContainer.createEl('button', { cls: 'tdc-prompt-btn tdc-prompt-btn-confirm' });
        confirmBtn.innerHTML = 'Create Issue <kbd>↵</kbd>';
        confirmBtn.addEventListener('click', () => this.confirm());
        const cancelBtn = btnContainer.createEl('button', { cls: 'tdc-prompt-btn tdc-prompt-btn-cancel' });
        cancelBtn.innerHTML = 'Cancel <kbd>Esc</kbd>';
        cancelBtn.addEventListener('click', () => this.close());
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.confirm();
            }
        });
    }
    private async confirm() {
        const value = this.input.value.trim();
        this.close();
        await this.createIssue(value || undefined);
    }
    private async createIssue(githubLink?: string) {
        try {
            const issue = await this.plugin.issueManager.createIssue({
                name: this.issueName,
                priority: this.priority,
                githubLink,
                dashboard: this.dashboard
            });
            new Notice(`Created issue: ${this.issueName}`);
            const file = this.app.vault.getAbstractFileByPath(issue.filePath);
            if (file instanceof TFile) {
                const leaf = this.app.workspace.getLeaf();
                await leaf.openFile(file);
                setTimeout(() => {
                    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view?.editor) {
                        const editor = view.editor;
                        const lastLine = editor.lastLine();
                        const lastLineLength = editor.getLine(lastLine).length;
                        editor.setCursor({ line: lastLine, ch: lastLineLength });
                        editor.focus();
                    }
                }, 100);
            }
        } catch (error) {
            new Notice(`Error creating issue: ${(error as Error).message}`);
        }
    }
    onClose() {
        this.contentEl.empty();
    }
}

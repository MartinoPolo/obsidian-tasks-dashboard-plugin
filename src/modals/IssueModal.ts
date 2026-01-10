import { App, Modal, Notice, Setting } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { DashboardConfig, Priority } from '../types';
export class IssueModal extends Modal {
    private name: string = '';
    private priority: Priority = 'medium';
    private githubLink: string = '';
    private dashboard: DashboardConfig;
    private plugin: TasksDashboardPlugin;
    constructor(app: App, plugin: TasksDashboardPlugin, dashboard: DashboardConfig) {
        super(app);
        this.plugin = plugin;
        this.dashboard = dashboard;
    }
    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('tdc-issue-modal');
        contentEl.createEl('h2', { text: `New Issue: ${this.dashboard.name}` });
        new Setting(contentEl)
            .setName('Issue Name')
            .addText(text => text
                .setPlaceholder('e.g., Implement user authentication')
                .onChange(value => this.name = value));
        new Setting(contentEl)
            .setName('Priority');
        const priorityContainer = contentEl.createDiv({ cls: 'tdc-priority-selector' });
        const priorities: Priority[] = ['low', 'medium', 'high', 'top'];
        priorities.forEach(p => {
            const btn = priorityContainer.createEl('button', {
                text: p.charAt(0).toUpperCase() + p.slice(1),
                cls: `tdc-priority-btn tdc-priority-${p} ${p === this.priority ? 'selected' : ''}`
            });
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                priorityContainer.querySelectorAll('.tdc-priority-btn').forEach(el => el.removeClass('selected'));
                btn.addClass('selected');
                this.priority = p;
            });
        });
        new Setting(contentEl)
            .setName('GitHub Link (optional)')
            .addText(text => text
                .setPlaceholder('https://github.com/org/repo/issues/123')
                .onChange(value => this.githubLink = value));
        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Create Issue')
                .setCta()
                .onClick(() => this.createIssue()));
    }
    private async createIssue() {
        if (!this.name.trim()) {
            new Notice('Please enter an issue name');
            return;
        }
        try {
            await this.plugin.issueManager.createIssue({
                name: this.name.trim(),
                priority: this.priority,
                githubLink: this.githubLink.trim() || undefined,
                dashboard: this.dashboard
            });
            new Notice(`Created issue: ${this.name}`);
            this.close();
        } catch (error) {
            new Notice(`Error creating issue: ${(error as Error).message}`);
        }
    }
    onClose() {
        this.contentEl.empty();
    }
}

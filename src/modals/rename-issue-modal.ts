import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import TasksDashboardPlugin from '../../main';
import type { DashboardConfig } from '../types';
import RenameIssueContent from '../components/modals/RenameIssueContent.svelte';

export class RenameIssueModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueId: string;
	private currentName: string;
	private svelteComponent: ReturnType<typeof mount> | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueId: string,
		currentName: string
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueId = issueId;
		this.currentName = currentName;
	}

	onOpen() {
		const { modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');

		this.svelteComponent = mount(RenameIssueContent, {
			target: this.contentEl,
			props: {
				plugin: this.plugin,
				dashboard: this.dashboard,
				issueId: this.issueId,
				currentName: this.currentName,
				onclose: () => this.close()
			}
		});
	}

	onClose() {
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
			this.svelteComponent = undefined;
		}
		this.contentEl.empty();
	}
}

import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import TasksDashboardPlugin from '../../main';
import type { DashboardConfig } from '../types';
import WorktreeRetryContent from '../components/modals/WorktreeRetryContent.svelte';

interface WorktreeRetryModalOptions {
	dashboard: DashboardConfig;
	issueId: string;
	suggestedBranchName: string;
	worktreeOriginFolder: string | undefined;
}

export class WorktreeRetryModal extends Modal {
	private plugin: TasksDashboardPlugin;
	private options: WorktreeRetryModalOptions;
	private svelteComponent: ReturnType<typeof mount> | undefined;

	constructor(app: App, plugin: TasksDashboardPlugin, options: WorktreeRetryModalOptions) {
		super(app);
		this.plugin = plugin;
		this.options = options;
	}

	onOpen(): void {
		const { modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal', 'tdc-worktree-retry-modal');

		this.svelteComponent = mount(WorktreeRetryContent, {
			target: this.contentEl,
			props: {
				plugin: this.plugin,
				dashboard: this.options.dashboard,
				issueId: this.options.issueId,
				suggestedBranchName: this.options.suggestedBranchName,
				worktreeOriginFolder: this.options.worktreeOriginFolder,
				onclose: () => this.close()
			}
		});
	}

	onClose(): void {
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
			this.svelteComponent = undefined;
		}
		this.contentEl.empty();
	}
}

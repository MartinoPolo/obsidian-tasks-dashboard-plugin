import { App } from 'obsidian';
import type { Component } from 'svelte';
import TasksDashboardPlugin from '../../main';
import type { DashboardConfig } from '../types';
import WorktreeRetryContent from '../components/modals/WorktreeRetryContent.svelte';
import { SvelteModal } from './SvelteModal';

interface WorktreeRetryModalOptions {
	dashboard: DashboardConfig;
	issueId: string;
	suggestedBranchName: string;
	worktreeOriginFolder: string | undefined;
}

export class WorktreeRetryModal extends SvelteModal {
	private plugin: TasksDashboardPlugin;
	private options: WorktreeRetryModalOptions;

	constructor(app: App, plugin: TasksDashboardPlugin, options: WorktreeRetryModalOptions) {
		super(app);
		this.plugin = plugin;
		this.options = options;
	}

	protected getComponent(): Component {
		return WorktreeRetryContent as Component;
	}

	protected getProps(): Record<string, unknown> {
		return {
			plugin: this.plugin,
			dashboard: this.options.dashboard,
			issueId: this.options.issueId,
			suggestedBranchName: this.options.suggestedBranchName,
			worktreeOriginFolder: this.options.worktreeOriginFolder,
			onclose: () => this.close()
		};
	}

	protected override getModalClasses(): string[] {
		return ['tdc-prompt-modal', 'tdc-worktree-retry-modal'];
	}
}

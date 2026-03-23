import { App } from 'obsidian';
import type { Component } from 'svelte';
import TasksDashboardPlugin from '../../main';
import type { DashboardConfig } from '../types';
import FolderPathContent from '../components/modals/FolderPathContent.svelte';
import { SvelteModal } from './SvelteModal';

export class FolderPathModal extends SvelteModal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueId: string | undefined;

	constructor(
		app: App,
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		issueId?: string
	) {
		super(app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.issueId = issueId;
	}

	protected getComponent(): Component {
		return FolderPathContent as Component;
	}

	protected getProps(): Record<string, unknown> {
		return {
			plugin: this.plugin,
			dashboard: this.dashboard,
			issueId: this.issueId,
			onclose: () => this.close()
		};
	}
}

import { App } from 'obsidian';
import type { Component } from 'svelte';
import TasksDashboardPlugin from '../../main';
import type { DashboardConfig } from '../types';
import RenameIssueContent from '../components/modals/RenameIssueContent.svelte';
import { SvelteModal } from './SvelteModal';

export class RenameIssueModal extends SvelteModal {
	private plugin: TasksDashboardPlugin;
	private dashboard: DashboardConfig;
	private issueId: string;
	private currentName: string;

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

	protected getComponent(): Component {
		return RenameIssueContent as Component;
	}

	protected getProps(): Record<string, unknown> {
		return {
			plugin: this.plugin,
			dashboard: this.dashboard,
			issueId: this.issueId,
			currentName: this.currentName,
			onclose: () => this.close()
		};
	}
}

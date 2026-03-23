import type { Component } from 'svelte';
import type TasksDashboardPlugin from '../../main';
import type { DashboardConfig } from '../types';
import RepositoryLinkerContent from '../components/modals/RepositoryLinkerContent.svelte';
import { SvelteModal } from './SvelteModal';

type OnSaveRepositories = (linkedRepos: string[]) => void;

export class RepositoryLinkerModal extends SvelteModal {
	private readonly plugin: TasksDashboardPlugin;
	private readonly dashboard: DashboardConfig;
	private readonly onSave: OnSaveRepositories;

	constructor(
		plugin: TasksDashboardPlugin,
		dashboard: DashboardConfig,
		onSave: OnSaveRepositories
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.dashboard = dashboard;
		this.onSave = onSave;
	}

	protected getComponent(): Component {
		return RepositoryLinkerContent as Component;
	}

	protected getProps(): Record<string, unknown> {
		return {
			plugin: this.plugin,
			dashboard: this.dashboard,
			onclose: () => this.close(),
			onsave: this.onSave
		};
	}

	protected override getContainerClasses(): string[] {
		return [];
	}

	protected override getModalClasses(): string[] {
		return [];
	}
}

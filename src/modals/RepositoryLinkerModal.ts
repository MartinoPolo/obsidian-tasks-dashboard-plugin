import { Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import type TasksDashboardPlugin from '../../main';
import type { DashboardConfig } from '../types';
import RepositoryLinkerContent from '../components/modals/RepositoryLinkerContent.svelte';

type OnSaveRepositories = (linkedRepos: string[]) => void;

export class RepositoryLinkerModal extends Modal {
	private readonly plugin: TasksDashboardPlugin;
	private readonly dashboard: DashboardConfig;
	private readonly onSave: OnSaveRepositories;
	private svelteComponent: ReturnType<typeof mount> | undefined;

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

	override onOpen(): void {
		this.svelteComponent = mount(RepositoryLinkerContent, {
			target: this.contentEl,
			props: {
				plugin: this.plugin,
				dashboard: this.dashboard,
				onclose: () => this.close(),
				onsave: this.onSave
			}
		});
	}

	override onClose(): void {
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
			this.svelteComponent = undefined;
		}
		this.contentEl.empty();
	}
}

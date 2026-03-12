import { App, PluginSettingTab } from 'obsidian';
import { mount, unmount } from 'svelte';
import TasksDashboardPlugin from '../main';
import SettingsTab from './components/settings/SettingsTab.svelte';

export class TasksDashboardSettingTab extends PluginSettingTab {
	plugin: TasksDashboardPlugin;
	private component: ReturnType<typeof mount> | undefined;

	constructor(app: App, plugin: TasksDashboardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		this.containerEl.empty();
		this.component = mount(SettingsTab, {
			target: this.containerEl,
			props: { plugin: this.plugin }
		});
	}

	hide(): void {
		if (this.component !== undefined) {
			void unmount(this.component);
			this.component = undefined;
		}
	}
}

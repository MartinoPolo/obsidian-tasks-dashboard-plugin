import type TasksDashboardPlugin from '../../main';

export function saveSettings(plugin: TasksDashboardPlugin): void {
	void plugin.saveSettings();
}

export function saveSettingsAndRefreshDashboard(plugin: TasksDashboardPlugin): void {
	void plugin.saveSettings();
	plugin.triggerDashboardRefresh();
}

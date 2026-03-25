import { Notice } from 'obsidian';
import type { App } from 'obsidian';
import type { DashboardConfig, TasksDashboardSettings } from '../types';
import {
	observeContentBlockSiblings,
	setIssueCollapsed as setIssueCollapsedDom
} from './dashboard-issue-surface';
import { getDashboardIssueIds } from './dashboard-content-reader';

export interface CollapseDependencies {
	app: App;
	dashboard: DashboardConfig;
	settings: TasksDashboardSettings;
	saveSettings: () => Promise<void>;
	triggerDashboardRefresh: () => void;
}

export function findDashboardElement(containerElement: HTMLElement): Element | null {
	return (
		containerElement.closest('.markdown-preview-view') ??
		containerElement.closest('.markdown-reading-view') ??
		containerElement.closest('.cm-editor') ??
		containerElement.closest('.markdown-source-view')
	);
}

export function applyCollapseToControlBlocks(
	dashboardElement: Element,
	collapsed: boolean,
	collapsedIssues: Record<string, boolean>
): void {
	for (const controlBlock of Array.from(
		dashboardElement.querySelectorAll(
			'.block-language-tasks-dashboard-controls, [data-tdc-issue]'
		)
	)) {
		if (controlBlock instanceof HTMLElement) {
			const issueId = controlBlock.getAttribute('data-tdc-issue') ?? '';
			const shouldBeCollapsed = collapsed && collapsedIssues[issueId] === true;
			setIssueCollapsedDom(controlBlock, shouldBeCollapsed);
			if (shouldBeCollapsed) {
				observeContentBlockSiblings(
					controlBlock,
					() => collapsedIssues[issueId] === true,
					() => {}
				);
			}
		}
	}
}

export function toggleAllIssues(
	collapsed: boolean,
	dependencies: CollapseDependencies,
	containerElement: HTMLElement
): void {
	const { app, dashboard, settings, saveSettings, triggerDashboardRefresh } = dependencies;

	void getDashboardIssueIds(app, dashboard)
		.then((issueIds) => {
			for (const issueId of issueIds) {
				if (collapsed) {
					settings.collapsedIssues[issueId] = true;
				} else {
					delete settings.collapsedIssues[issueId];
				}
			}
			void saveSettings();

			const dashboardElement = findDashboardElement(containerElement);
			if (dashboardElement !== null) {
				applyCollapseToControlBlocks(dashboardElement, collapsed, settings.collapsedIssues);
			}

			triggerDashboardRefresh();
		})
		.catch(() => {
			new Notice('Could not toggle issues.');
		});
}

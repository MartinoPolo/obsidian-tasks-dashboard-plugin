import { EventRef, MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import TasksDashboardPlugin from '../../main';
import { REACTIVE_RENDER_DEBOUNCE_MS } from './dashboard-renderer-constants';

interface WorkspaceCustomEventEmitter {
	on: (name: string, callback: () => void) => EventRef;
}

export type RenderFunction = (
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
) => void | Promise<void>;

export class ReactiveRenderChild extends MarkdownRenderChild {
	private debounceTimer: number | undefined;

	constructor(
		containerEl: HTMLElement,
		private source: string,
		private ctx: MarkdownPostProcessorContext,
		plugin: TasksDashboardPlugin,
		private renderFunction: RenderFunction
	) {
		super(containerEl);
		// Register in constructor — ctx.addChild() may never call onload()
		const workspaceEvents = plugin.app.workspace as unknown as WorkspaceCustomEventEmitter;
		this.registerEvent(
			workspaceEvents.on('tasks-dashboard:refresh', () => {
				window.clearTimeout(this.debounceTimer);
				this.debounceTimer = window.setTimeout(() => {
					this.containerEl.empty();
					const result = this.renderFunction(this.source, this.containerEl, this.ctx);
					if (result instanceof Promise) {
						result.catch((error: unknown) => {
							console.error('Tasks Dashboard: reactive render failed', error);
							this.containerEl.createEl('span', {
								text: 'Failed to render',
								cls: 'tdc-error'
							});
						});
					}
				}, REACTIVE_RENDER_DEBOUNCE_MS);
			})
		);
	}
}

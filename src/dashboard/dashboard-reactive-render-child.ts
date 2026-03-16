import { EventRef, MarkdownPostProcessorContext, MarkdownRenderChild } from 'obsidian';
import { unmount } from 'svelte';
import TasksDashboardPlugin from '../../main';
import { REACTIVE_RENDER_DEBOUNCE_MS } from './dashboard-renderer-constants';

interface WorkspaceCustomEventEmitter {
	on: (name: string, callback: () => void) => EventRef;
}

export type MountFunction = (
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
) => Record<string, unknown> | undefined;

export class ReactiveRenderChild extends MarkdownRenderChild {
	private debounceTimer: number | undefined;
	private currentComponent: Record<string, unknown> | undefined;

	constructor(
		containerEl: HTMLElement,
		private source: string,
		private ctx: MarkdownPostProcessorContext,
		plugin: TasksDashboardPlugin,
		private mountFunction: MountFunction
	) {
		super(containerEl);

		this.currentComponent = this.mountFunction(this.source, this.containerEl, this.ctx);

		const workspaceEvents = plugin.app.workspace as unknown as WorkspaceCustomEventEmitter;
		this.registerEvent(
			workspaceEvents.on('tasks-dashboard:refresh', () => {
				window.clearTimeout(this.debounceTimer);
				this.debounceTimer = window.setTimeout(() => {
					this.unmountCurrent();
					this.containerEl.empty();
					try {
						this.currentComponent = this.mountFunction(
							this.source,
							this.containerEl,
							this.ctx
						);
					} catch (error) {
						console.error('Tasks Dashboard: reactive render failed', error);
						this.containerEl.createEl('span', {
							text: 'Failed to render',
							cls: 'tdc-error'
						});
					}
				}, REACTIVE_RENDER_DEBOUNCE_MS);
			})
		);
	}

	private unmountCurrent(): void {
		if (this.currentComponent !== undefined) {
			void unmount(this.currentComponent);
			this.currentComponent = undefined;
		}
	}

	onunload(): void {
		super.onunload();
		window.clearTimeout(this.debounceTimer);
		this.unmountCurrent();
	}
}

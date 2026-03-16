import { Modal } from 'obsidian';
import type { Component } from 'svelte';
import { mount, unmount } from 'svelte';

export abstract class SvelteModal extends Modal {
	private svelteComponent: Record<string, unknown> | undefined;

	protected abstract getComponent(): Component;
	protected abstract getProps(): Record<string, unknown>;

	protected getModalClasses(): string[] {
		return ['tdc-prompt-modal'];
	}

	protected getContainerClasses(): string[] {
		return ['tdc-top-modal'];
	}

	onOpen(): void {
		const { modalEl, containerEl } = this;
		for (const cls of this.getContainerClasses()) {
			containerEl.addClass(cls);
		}
		for (const cls of this.getModalClasses()) {
			modalEl.addClass(cls);
		}

		this.svelteComponent = mount(this.getComponent(), {
			target: this.contentEl,
			props: this.getProps()
		});
	}

	onClose(): void {
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
			this.svelteComponent = undefined;
		}
		this.contentEl.empty();
	}
}

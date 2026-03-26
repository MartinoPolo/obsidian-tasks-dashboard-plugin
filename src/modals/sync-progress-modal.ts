import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import SyncProgressContent from '../components/modals/SyncProgressContent.svelte';
import type { SyncStep, SyncStepStatus } from '../git-status/sync-types';

export class SyncProgressModal extends Modal {
	private readonly baseBranch: string;
	private steps: SyncStep[];
	private svelteComponent: ReturnType<typeof mount> | undefined;

	constructor(app: App, baseBranch: string) {
		super(app);
		this.baseBranch = baseBranch;
		this.steps = [
			{ label: 'Checking for conflicts...', status: 'pending' },
			{ label: `Merging origin/${baseBranch}...`, status: 'pending' },
			{ label: 'Pushing...', status: 'pending' }
		];
	}

	onOpen() {
		const { modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');

		this.mountComponent();
	}

	onClose() {
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
			this.svelteComponent = undefined;
		}
		this.contentEl.empty();
	}

	updateStep(stepIndex: number, status: SyncStepStatus, errorMessage?: string): void {
		if (stepIndex < 0 || stepIndex >= this.steps.length) {
			return;
		}
		this.steps = this.steps.map((step, index) => {
			if (index === stepIndex) {
				return { ...step, status, errorMessage };
			}
			return step;
		});
		this.remount();
	}

	private mountComponent(): void {
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
		}
		this.contentEl.empty();
		this.svelteComponent = mount(SyncProgressContent, {
			target: this.contentEl,
			props: {
				baseBranch: this.baseBranch,
				steps: this.steps,
				onclose: () => this.close()
			}
		});
	}

	private remount(): void {
		this.mountComponent();
	}
}

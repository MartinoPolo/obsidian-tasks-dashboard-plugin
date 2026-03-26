import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import NoUpstreamContent from '../components/modals/NoUpstreamContent.svelte';

export type NoUpstreamChoice = 'cancel' | 'let-claude-handle' | 'push-set-upstream';

export class NoUpstreamModal extends Modal {
	private readonly branchName: string;
	private readonly onResult: (choice: NoUpstreamChoice) => void;
	private hasResolved = false;
	private svelteComponent: ReturnType<typeof mount> | undefined;

	constructor(app: App, branchName: string, onResult: (choice: NoUpstreamChoice) => void) {
		super(app);
		this.branchName = branchName;
		this.onResult = onResult;
	}

	onOpen() {
		const { modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');

		this.svelteComponent = mount(NoUpstreamContent, {
			target: this.contentEl,
			props: {
				branchName: this.branchName,
				oncancel: () => this.resolve('cancel'),
				onclaudehandle: () => this.resolve('let-claude-handle'),
				onpushsetupstream: () => this.resolve('push-set-upstream')
			}
		});
	}

	onClose() {
		if (!this.hasResolved) {
			this.hasResolved = true;
			this.onResult('cancel');
		}
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
			this.svelteComponent = undefined;
		}
		this.contentEl.empty();
	}

	private resolve(choice: NoUpstreamChoice) {
		if (this.hasResolved) {
			return;
		}
		this.hasResolved = true;
		this.onResult(choice);
		this.close();
	}
}

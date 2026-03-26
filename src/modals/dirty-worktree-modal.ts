import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import DirtyWorktreeContent from '../components/modals/DirtyWorktreeContent.svelte';

export type DirtyWorktreeChoice = 'handle-yourself' | 'let-claude-handle';

export class DirtyWorktreeModal extends Modal {
	private readonly branchName: string;
	private readonly onResult: (choice: DirtyWorktreeChoice) => void;
	private hasResolved = false;
	private svelteComponent: ReturnType<typeof mount> | undefined;

	constructor(app: App, branchName: string, onResult: (choice: DirtyWorktreeChoice) => void) {
		super(app);
		this.branchName = branchName;
		this.onResult = onResult;
	}

	onOpen() {
		const { modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');

		this.svelteComponent = mount(DirtyWorktreeContent, {
			target: this.contentEl,
			props: {
				branchName: this.branchName,
				onhandleyourself: () => this.resolve('handle-yourself'),
				onletclaudehandle: () => this.resolve('let-claude-handle')
			}
		});
	}

	onClose() {
		if (!this.hasResolved) {
			this.hasResolved = true;
			this.onResult('handle-yourself');
		}
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
			this.svelteComponent = undefined;
		}
		this.contentEl.empty();
	}

	private resolve(choice: DirtyWorktreeChoice) {
		if (this.hasResolved) {
			return;
		}
		this.hasResolved = true;
		this.onResult(choice);
		this.close();
	}
}

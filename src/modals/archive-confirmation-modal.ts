import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import ConfirmationDialog from '../components/modals/ConfirmationDialog.svelte';

export interface ArchiveConfirmationResult {
	confirmed: boolean;
	removeWorktree: boolean;
}

export class ArchiveConfirmationModal extends Modal {
	private readonly issueName: string;
	private readonly hasAssociatedWorktree: boolean;
	private readonly unfinishedTaskCount: number;
	private readonly onResult: (result: ArchiveConfirmationResult) => void;
	private removeWorktree = true;
	private hasResolved = false;
	private svelteComponent: ReturnType<typeof mount> | undefined;

	constructor(
		app: App,
		issueName: string,
		hasAssociatedWorktree: boolean,
		unfinishedTaskCount: number,
		onResult: (result: ArchiveConfirmationResult) => void
	) {
		super(app);
		this.issueName = issueName;
		this.hasAssociatedWorktree = hasAssociatedWorktree;
		this.unfinishedTaskCount = unfinishedTaskCount;
		this.onResult = onResult;
	}

	onOpen() {
		const { modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');

		const warningText =
			this.unfinishedTaskCount > 0
				? `⚠ ${this.unfinishedTaskCount} unfinished ${this.unfinishedTaskCount === 1 ? 'task' : 'tasks'} remaining.`
				: undefined;

		this.svelteComponent = mount(ConfirmationDialog, {
			target: this.contentEl,
			props: {
				title: 'Confirm Archive',
				message: `Are you sure you want to archive '${this.issueName}'?`,
				confirmLabel: 'Archive',
				warningText,
				checkboxLabel: this.hasAssociatedWorktree
					? 'Also remove associated worktree'
					: undefined,
				checkboxChecked: this.removeWorktree,
				oncheckboxchange: (checked: boolean) => {
					this.removeWorktree = checked;
				},
				onconfirm: () => this.confirm(),
				oncancel: () => this.cancel()
			}
		});
	}

	onClose() {
		if (!this.hasResolved) {
			this.hasResolved = true;
			this.onResult({ confirmed: false, removeWorktree: this.removeWorktree });
		}
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
			this.svelteComponent = undefined;
		}
		this.contentEl.empty();
	}

	private cancel() {
		if (this.hasResolved) {
			return;
		}
		this.hasResolved = true;
		this.onResult({ confirmed: false, removeWorktree: this.removeWorktree });
		this.close();
	}

	private confirm() {
		if (this.hasResolved) {
			return;
		}
		this.hasResolved = true;
		this.close();
		this.onResult({ confirmed: true, removeWorktree: this.removeWorktree });
	}
}

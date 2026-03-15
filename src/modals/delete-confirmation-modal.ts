import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import ConfirmationDialog from '../components/modals/ConfirmationDialog.svelte';

export interface DeleteConfirmationResult {
	confirmed: boolean;
	removeWorktree: boolean;
}

export class DeleteConfirmationModal extends Modal {
	private readonly issueName: string;
	private readonly hasAssociatedWorktree: boolean;
	private readonly unfinishedTaskCount: number;
	private readonly onRemoveWorktreeChange?: (checked: boolean) => void;
	private readonly onResult: (result: DeleteConfirmationResult) => void;
	private removeWorktree = false;
	private hasResolved = false;
	private svelteComponent: ReturnType<typeof mount> | undefined;

	constructor(
		app: App,
		issueName: string,
		hasAssociatedWorktree: boolean,
		unfinishedTaskCount: number,
		initialRemoveWorktree: boolean,
		onRemoveWorktreeChange: ((checked: boolean) => void) | undefined,
		onResult: (result: DeleteConfirmationResult) => void
	) {
		super(app);
		this.issueName = issueName;
		this.hasAssociatedWorktree = hasAssociatedWorktree;
		this.unfinishedTaskCount = unfinishedTaskCount;
		this.removeWorktree = hasAssociatedWorktree ? initialRemoveWorktree : false;
		this.onRemoveWorktreeChange = onRemoveWorktreeChange;
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
				title: 'Confirm Delete',
				message: `Are you sure you want to delete '${this.issueName}'? This will move the file to trash.`,
				confirmLabel: 'Delete',
				confirmClass: 'tdc-prompt-btn-delete',
				warningText,
				checkboxLabel: this.hasAssociatedWorktree
					? 'Also remove associated worktree'
					: undefined,
				checkboxChecked: this.removeWorktree,
				oncheckboxchange: (checked: boolean) => {
					this.removeWorktree = checked;
					this.onRemoveWorktreeChange?.(checked);
				},
				onconfirm: () => this.confirmDelete(),
				oncancel: () => this.cancelDelete()
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

	private cancelDelete() {
		if (this.hasResolved) {
			return;
		}
		this.hasResolved = true;
		this.onResult({ confirmed: false, removeWorktree: this.removeWorktree });
		this.close();
	}

	private confirmDelete() {
		if (this.hasResolved) {
			return;
		}
		this.hasResolved = true;
		this.close();
		this.onResult({ confirmed: true, removeWorktree: this.removeWorktree });
	}
}

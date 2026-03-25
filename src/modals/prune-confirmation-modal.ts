import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import PruneConfirmationDialog from '../components/modals/PruneConfirmationDialog.svelte';

export interface PrunableIssueInfo {
	issueId: string;
	issueName: string;
	branchName: string;
}

export class PruneConfirmationModal extends Modal {
	private readonly prunableIssues: PrunableIssueInfo[];
	private readonly onResult: (confirmed: boolean) => void;
	private hasResolved = false;
	private svelteComponent: ReturnType<typeof mount> | undefined;

	constructor(
		app: App,
		prunableIssues: PrunableIssueInfo[],
		onResult: (confirmed: boolean) => void
	) {
		super(app);
		this.prunableIssues = prunableIssues;
		this.onResult = onResult;
	}

	onOpen() {
		const { modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');

		this.svelteComponent = mount(PruneConfirmationDialog, {
			target: this.contentEl,
			props: {
				prunableIssues: this.prunableIssues,
				onconfirm: () => this.confirm(),
				oncancel: () => this.cancel()
			}
		});
	}

	onClose() {
		if (!this.hasResolved) {
			this.hasResolved = true;
			this.onResult(false);
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
		this.onResult(false);
		this.close();
	}

	private confirm() {
		if (this.hasResolved) {
			return;
		}
		this.hasResolved = true;
		this.onResult(true);
		this.close();
	}
}

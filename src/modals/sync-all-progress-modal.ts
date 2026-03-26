import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import SyncAllProgressContent from '../components/modals/SyncAllProgressContent.svelte';
import type { BranchSyncLine, BranchSyncStatus } from '../git-status/sync-types';

export type { BranchSyncLine, BranchSyncStatus };

export class SyncAllProgressModal extends Modal {
	private branches: BranchSyncLine[];
	private isComplete = false;
	private svelteComponent: ReturnType<typeof mount> | undefined;
	private claudeHandleCallback: ((branchName: string) => void) | undefined;

	constructor(app: App, branchNames: string[]) {
		super(app);
		this.branches = branchNames.map((name) => ({
			branchName: name,
			status: 'pending' as BranchSyncStatus
		}));
	}

	setClaudeHandleCallback(callback: (branchName: string) => void): void {
		this.claudeHandleCallback = callback;
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

	updateBranch(branchName: string, status: BranchSyncStatus, errorMessage?: string): void {
		this.branches = this.branches.map((branch) => {
			if (branch.branchName === branchName) {
				return { ...branch, status, errorMessage };
			}
			return branch;
		});
		this.remount();
	}

	markComplete(): void {
		this.isComplete = true;
		this.remount();
	}

	private mountComponent(): void {
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
		}
		this.contentEl.empty();
		this.svelteComponent = mount(SyncAllProgressContent, {
			target: this.contentEl,
			props: {
				branches: this.branches,
				isComplete: this.isComplete,
				onclose: () => this.close(),
				onclaudehandle: this.claudeHandleCallback
			}
		});
	}

	private remount(): void {
		this.mountComponent();
	}
}

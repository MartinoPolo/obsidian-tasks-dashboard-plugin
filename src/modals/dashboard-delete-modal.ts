import { App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import ConfirmationDialog from '../components/modals/ConfirmationDialog.svelte';

export interface DashboardDeleteResult {
	confirmed: boolean;
	deleteFiles: boolean;
}

export class DashboardDeleteConfirmationModal extends Modal {
	private readonly dashboardName: string;
	private readonly onResult: (result: DashboardDeleteResult) => void;
	private deleteFiles = false;
	private hasResolved = false;
	private svelteComponent: ReturnType<typeof mount> | undefined;

	constructor(
		app: App,
		dashboardName: string,
		onResult: (result: DashboardDeleteResult) => void
	) {
		super(app);
		this.dashboardName = dashboardName;
		this.onResult = onResult;
	}

	onOpen() {
		const { modalEl, containerEl } = this;
		containerEl.addClass('tdc-top-modal');
		modalEl.addClass('tdc-prompt-modal');

		this.svelteComponent = mount(ConfirmationDialog, {
			target: this.contentEl,
			props: {
				title: 'Delete Dashboard',
				message: `Are you sure you want to remove the dashboard "${this.dashboardName}" from settings?`,
				confirmLabel: 'Delete',
				confirmClass: 'tdc-prompt-btn-delete',
				checkboxLabel:
					'Also delete dashboard file and issues folder (moved to system trash)',
				checkboxChecked: this.deleteFiles,
				oncheckboxchange: (checked: boolean) => {
					this.deleteFiles = checked;
				},
				onconfirm: () => this.handleConfirm(),
				oncancel: () => this.handleCancel()
			}
		});
	}

	onClose() {
		if (!this.hasResolved) {
			this.hasResolved = true;
			this.onResult({ confirmed: false, deleteFiles: this.deleteFiles });
		}
		if (this.svelteComponent !== undefined) {
			void unmount(this.svelteComponent);
			this.svelteComponent = undefined;
		}
		this.contentEl.empty();
	}

	private handleCancel() {
		if (this.hasResolved) {
			return;
		}
		this.hasResolved = true;
		this.onResult({ confirmed: false, deleteFiles: this.deleteFiles });
		this.close();
	}

	private handleConfirm() {
		if (this.hasResolved) {
			return;
		}
		this.hasResolved = true;
		this.close();
		this.onResult({ confirmed: true, deleteFiles: this.deleteFiles });
	}
}

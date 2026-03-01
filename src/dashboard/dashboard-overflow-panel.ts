import TasksDashboardPlugin from '../../main';
import type { DashboardConfig, IssueActionKey } from '../types';
import { createActionButton, ICONS } from './header-actions';
import { ISSUE_ACTION_ORDER } from './dashboard-renderer-constants';
import { dedupeIssueActionKeys, saveIssueActionLayout } from './dashboard-renderer-layout';
import type {
	IssueActionDescriptor,
	RuntimeIssueActionLayout
} from './dashboard-renderer-types';

interface OverflowMenuPanelOptions {
	plugin: TasksDashboardPlugin;
	overflowButton: HTMLElement;
	dashboard: DashboardConfig;
	actions: Map<IssueActionKey, IssueActionDescriptor>;
	layout: RuntimeIssueActionLayout;
	getVisibleActionKeys: () => Set<IssueActionKey>;
}

export const createOverflowMenuPanel = (options: OverflowMenuPanelOptions): (() => void) => {
	let panel: HTMLElement | undefined;
	let isOpen = false;
	let inSettingsMode = false;
	let hasAutoSavedLayoutChanges = false;
	let isDisposed = false;

	const draftLayout: RuntimeIssueActionLayout = {
		row1: [],
		row2: [],
		hidden: []
	};

	const resetDraftLayout = (): void => {
		draftLayout.row1 = [...options.layout.row1];
		draftLayout.row2 = [...options.layout.row2];
		draftLayout.hidden = [...options.layout.hidden];
	};

	resetDraftLayout();

	const createPanel = (): HTMLElement => {
		if (panel !== undefined) {
			return panel;
		}

		const createdPanel = document.createElement('div');
		createdPanel.className = 'tdc-overflow-panel tdc-overflow-panel-portal';
		createdPanel.style.display = 'none';
		document.body.appendChild(createdPanel);
		panel = createdPanel;
		return createdPanel;
	};

	const ensureActionPlacement = (): void => {
		for (const key of ISSUE_ACTION_ORDER) {
			const existsInRow1 = draftLayout.row1.includes(key);
			const existsInRow2 = draftLayout.row2.includes(key);
			if (!existsInRow1 && !existsInRow2) {
				draftLayout.row2.push(key);
			}
		}
		draftLayout.row1 = dedupeIssueActionKeys(draftLayout.row1);
		draftLayout.row2 = dedupeIssueActionKeys(
			draftLayout.row2.filter((key) => !draftLayout.row1.includes(key))
		);
		draftLayout.hidden = dedupeIssueActionKeys(draftLayout.hidden);
	};

	const persistDraftLayout = (): void => {
		ensureActionPlacement();
		saveIssueActionLayout(options.plugin, options.dashboard, draftLayout, {
			triggerRefresh: false
		});
		options.layout.row1 = [...draftLayout.row1];
		options.layout.row2 = [...draftLayout.row2];
		options.layout.hidden = [...draftLayout.hidden];
		hasAutoSavedLayoutChanges = true;
	};

	const positionPanel = (): void => {
		if (!isOpen || panel === undefined) {
			return;
		}

		if (!options.overflowButton.isConnected) {
			closePanel();
			return;
		}

		const triggerRect = options.overflowButton.getBoundingClientRect();
		const viewportPadding = 8;
		const panelWidth = Math.max(panel.offsetWidth, 280);
		const panelHeight = panel.offsetHeight;
		const maxLeft = window.innerWidth - panelWidth - viewportPadding;
		const alignedLeft = triggerRect.right - panelWidth;
		const left = Math.max(viewportPadding, Math.min(alignedLeft, maxLeft));

		let top = triggerRect.bottom + 4;
		const maxTop = window.innerHeight - panelHeight - viewportPadding;
		if (top > maxTop) {
			top = Math.max(viewportPadding, triggerRect.top - panelHeight - 4);
		}

		panel.style.left = `${left}px`;
		panel.style.top = `${top}px`;
	};

	const closePanelOnOutsideClick = (event: MouseEvent): void => {
		if (panel === undefined) {
			closePanel();
			return;
		}

		const target = event.target;
		if (!(target instanceof Node)) {
			closePanel();
			return;
		}

		if (panel.contains(target) || options.overflowButton.contains(target)) {
			return;
		}

		closePanel();
	};

	const closePanelOnEscape = (event: KeyboardEvent): void => {
		if (event.key !== 'Escape') {
			return;
		}
		event.preventDefault();
		event.stopPropagation();
		closePanel();
	};

	const closePanel = (): void => {
		if (!isOpen && panel === undefined) {
			return;
		}

		isOpen = false;
		inSettingsMode = false;
		resetDraftLayout();
		if (panel !== undefined) {
			panel.style.display = 'none';
			panel.remove();
			panel = undefined;
		}

		window.removeEventListener('scroll', positionPanel, true);
		window.removeEventListener('resize', positionPanel);
		window.removeEventListener('blur', closePanel);
		document.removeEventListener('click', closePanelOnOutsideClick, true);
		document.removeEventListener('keydown', closePanelOnEscape, true);

		if (hasAutoSavedLayoutChanges) {
			hasAutoSavedLayoutChanges = false;
			options.plugin.triggerDashboardRefresh();
		}
	};

	const renderActionsView = (): void => {
		if (panel === undefined) {
			return;
		}
		panel.empty();
		const actionsContainer = panel.createDiv({ cls: 'tdc-overflow-actions' });
		const visibleActionKeys = options.getVisibleActionKeys();
		let hasOverflowActions = false;

		for (const key of ISSUE_ACTION_ORDER) {
			const descriptor = options.actions.get(key);
			if (descriptor === undefined || !descriptor.shouldRender) {
				continue;
			}
			if (visibleActionKeys.has(key)) {
				continue;
			}

			hasOverflowActions = true;
			createActionButton({
				container: actionsContainer,
				iconKey: descriptor.iconKey,
				cssClass: `tdc-overflow-item ${descriptor.cssClass}`,
				ariaLabel: descriptor.label,
				faded: descriptor.faded,
				labelText: descriptor.label,
				onClick: (event) => {
					event.preventDefault();
					event.stopPropagation();
					descriptor.onClick();
					closePanel();
				}
			});
		}

		if (!hasOverflowActions) {
			actionsContainer.createDiv({
				cls: 'tdc-overflow-empty',
				text: 'No hidden actions'
			});
		}

		const settingsTrigger = panel.createEl('button', {
			cls: 'tdc-btn tdc-overflow-settings-toggle',
			text: 'Layout settings'
		});
		settingsTrigger.addEventListener('click', (event) => {
			event.preventDefault();
			event.stopPropagation();
			inSettingsMode = true;
			renderSettingsView();
		});
	};

	const renderSettingsRows = (container: HTMLElement, rowName: 'row1' | 'row2'): void => {
		const getActionPosition = (
			actionKey: IssueActionKey
		): { row: 'row1' | 'row2'; index: number } | undefined => {
			const row1Index = draftLayout.row1.indexOf(actionKey);
			if (row1Index !== -1) {
				return { row: 'row1', index: row1Index };
			}

			const row2Index = draftLayout.row2.indexOf(actionKey);
			if (row2Index !== -1) {
				return { row: 'row2', index: row2Index };
			}

			return undefined;
		};

		const canMoveAction = (actionKey: IssueActionKey, direction: 'up' | 'down'): boolean => {
			const position = getActionPosition(actionKey);
			if (position === undefined) {
				return false;
			}

			if (direction === 'up') {
				if (position.row === 'row1') {
					return position.index > 0;
				}
				return position.index >= 0;
			}

			if (position.row === 'row2') {
				return position.index < draftLayout.row2.length - 1;
			}
			return position.index <= draftLayout.row1.length - 1;
		};

		const moveActionByOne = (actionKey: IssueActionKey, direction: 'up' | 'down'): void => {
			const position = getActionPosition(actionKey);
			if (position === undefined) {
				return;
			}

			if (direction === 'up') {
				if (position.row === 'row1') {
					if (position.index === 0) {
						return;
					}
					const previousKey = draftLayout.row1[position.index - 1];
					draftLayout.row1[position.index - 1] = actionKey;
					draftLayout.row1[position.index] = previousKey;
					return;
				}

				if (position.index > 0) {
					const previousKey = draftLayout.row2[position.index - 1];
					draftLayout.row2[position.index - 1] = actionKey;
					draftLayout.row2[position.index] = previousKey;
					return;
				}

				draftLayout.row2.shift();
				draftLayout.row1.push(actionKey);
				return;
			}

			if (position.row === 'row2') {
				if (position.index >= draftLayout.row2.length - 1) {
					return;
				}
				const nextKey = draftLayout.row2[position.index + 1];
				draftLayout.row2[position.index + 1] = actionKey;
				draftLayout.row2[position.index] = nextKey;
				return;
			}

			if (position.index < draftLayout.row1.length - 1) {
				const nextKey = draftLayout.row1[position.index + 1];
				draftLayout.row1[position.index + 1] = actionKey;
				draftLayout.row1[position.index] = nextKey;
				return;
			}

			draftLayout.row1.pop();
			draftLayout.row2.unshift(actionKey);
		};

		for (const key of draftLayout[rowName]) {
			const descriptor = options.actions.get(key);
			if (descriptor === undefined) {
				continue;
			}

			const actionRow = container.createDiv({ cls: 'tdc-overflow-settings-row' });
			const actionInfo = actionRow.createDiv({ cls: 'tdc-overflow-settings-action-info' });
			const actionIcon = actionInfo.createSpan({ cls: 'tdc-overflow-settings-item-icon' });
			actionIcon.innerHTML = ICONS[descriptor.iconKey];
			actionInfo.createSpan({ text: descriptor.label });

			const actionButtons = actionRow.createDiv({ cls: 'tdc-overflow-settings-actions' });
			const isVisible = !draftLayout.hidden.includes(key);
			if (!isVisible) {
				actionRow.classList.add('tdc-overflow-settings-row-hidden');
			}
			const canMoveUp = canMoveAction(key, 'up');
			const canMoveDown = canMoveAction(key, 'down');
			createActionButton({
				container: actionButtons,
				iconKey: isVisible ? 'eye' : 'eyeOff',
				cssClass: 'tdc-overflow-settings-visibility',
				ariaLabel: isVisible ? `Hide ${descriptor.label}` : `Show ${descriptor.label}`,
				faded: false,
				onClick: () => {
					if (isVisible) {
						draftLayout.hidden.push(key);
					} else {
						draftLayout.hidden = draftLayout.hidden.filter(
							(hiddenKey) => hiddenKey !== key
						);
					}
					draftLayout.hidden = dedupeIssueActionKeys(draftLayout.hidden);
					persistDraftLayout();
					renderSettingsView();
				}
			});

			createActionButton({
				container: actionButtons,
				iconKey: 'up',
				cssClass: 'tdc-overflow-settings-move',
				ariaLabel: `Move ${descriptor.label} up`,
				faded: !canMoveUp,
				onClick: () => {
					if (!canMoveUp) {
						return;
					}
					moveActionByOne(key, 'up');
					persistDraftLayout();
					renderSettingsView();
				}
			});

			createActionButton({
				container: actionButtons,
				iconKey: 'down',
				cssClass: 'tdc-overflow-settings-move',
				ariaLabel: `Move ${descriptor.label} down`,
				faded: !canMoveDown,
				onClick: () => {
					if (!canMoveDown) {
						return;
					}
					moveActionByOne(key, 'down');
					persistDraftLayout();
					renderSettingsView();
				}
			});
		}
	};

	const renderSettingsView = (): void => {
		if (panel === undefined) {
			return;
		}
		panel.empty();
		ensureActionPlacement();

		const settingsContainer = panel.createDiv({ cls: 'tdc-overflow-settings' });
		renderSettingsRows(settingsContainer, 'row1');
		settingsContainer.createDiv({ cls: 'tdc-overflow-settings-divider' });
		renderSettingsRows(settingsContainer, 'row2');
	};

	const renderPanel = (): void => {
		if (inSettingsMode) {
			renderSettingsView();
			return;
		}
		renderActionsView();
	};

	const openPanel = (startInSettingsMode = false): void => {
		if (isDisposed) {
			return;
		}
		const overflowPanel = createPanel();
		inSettingsMode = startInSettingsMode;
		if (!startInSettingsMode) {
			resetDraftLayout();
		}
		overflowPanel.style.display = 'block';
		isOpen = true;
		renderPanel();
		requestAnimationFrame(positionPanel);

		window.addEventListener('scroll', positionPanel, true);
		window.addEventListener('resize', positionPanel);
		window.addEventListener('blur', closePanel);
		document.addEventListener('click', closePanelOnOutsideClick, true);
		document.addEventListener('keydown', closePanelOnEscape, true);
	};

	const handleOverflowButtonClick = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		if (isOpen) {
			closePanel();
			return;
		}
		openPanel(false);
	};

	const handleOverflowButtonContextMenu = (event: MouseEvent): void => {
		event.preventDefault();
		event.stopPropagation();
		if (isOpen) {
			inSettingsMode = true;
			renderPanel();
			requestAnimationFrame(positionPanel);
			return;
		}
		openPanel(true);
	};

	options.overflowButton.addEventListener('click', handleOverflowButtonClick);
	options.overflowButton.addEventListener('contextmenu', handleOverflowButtonContextMenu);

	return () => {
		if (isDisposed) {
			return;
		}
		isDisposed = true;
		closePanel();
		options.overflowButton.removeEventListener('click', handleOverflowButtonClick);
		options.overflowButton.removeEventListener('contextmenu', handleOverflowButtonContextMenu);
	};
};

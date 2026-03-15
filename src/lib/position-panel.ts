export interface PanelPosition {
	top: number;
	left: number;
	maxHeight: number;
}

/**
 * Calculate fixed-position coordinates for a panel anchored to a trigger element.
 * Chooses above/below placement based on available viewport space.
 */
export function calculatePanelPosition(
	panelElement: HTMLElement,
	anchorElement: HTMLElement,
	minPanelWidth: number
): PanelPosition {
	const triggerRect = anchorElement.getBoundingClientRect();
	const viewportPadding = 8;
	const panelWidth = Math.max(panelElement.offsetWidth, minPanelWidth);
	const verticalOffset = 4;
	const availableSpaceBelow = Math.max(
		120,
		window.innerHeight - triggerRect.bottom - viewportPadding - verticalOffset
	);
	const availableSpaceAbove = Math.max(120, triggerRect.top - viewportPadding - verticalOffset);
	const shouldOpenAbove = availableSpaceAbove > availableSpaceBelow;
	const maxHeight = shouldOpenAbove ? availableSpaceAbove : availableSpaceBelow;

	const panelHeight = panelElement.offsetHeight;
	const maxLeft = window.innerWidth - panelWidth - viewportPadding;
	const alignedLeft = triggerRect.right - panelWidth;
	const left = Math.max(viewportPadding, Math.min(alignedLeft, maxLeft));

	let top = triggerRect.bottom + verticalOffset;
	if (shouldOpenAbove) {
		top = Math.max(viewportPadding, triggerRect.top - panelHeight - verticalOffset);
	} else {
		const maxTop = window.innerHeight - panelHeight - viewportPadding;
		top = Math.max(viewportPadding, Math.min(top, maxTop));
	}

	return { top, left, maxHeight };
}

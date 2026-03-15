import { setTooltip } from 'obsidian';

export function attachTooltip(text: string, delay = 500) {
	return (node: HTMLElement) => {
		setTooltip(node, text, { delay });

		return () => {
			// Clear tooltip text so Obsidian does not attempt to show a stale tooltip
			// if the element is reused or lingers after detach.
			setTooltip(node, '', { delay });
		};
	};
}

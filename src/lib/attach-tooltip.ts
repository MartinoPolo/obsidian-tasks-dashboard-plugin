import { setTooltip } from 'obsidian';

export function attachTooltip(text: string, delay = 500) {
	return (node: HTMLElement) => {
		setTooltip(node, text, { delay });
	};
}

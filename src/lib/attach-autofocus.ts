export function attachAutofocus(options?: { select?: boolean; cursorEnd?: boolean }) {
	return (node: HTMLInputElement) => {
		node.focus();
		if (options?.select === true) {
			node.select();
		}
		if (options?.cursorEnd === true) {
			const length = node.value.length;
			node.setSelectionRange(length, length);
		}
	};
}

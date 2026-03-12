export function attachPortal(className?: string) {
	return (node: HTMLElement) => {
		if (className !== undefined) {
			node.classList.add(className);
		}
		document.body.appendChild(node);
		return () => node.remove();
	};
}

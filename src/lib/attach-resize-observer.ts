export function attachResizeObserver(callback: ResizeObserverCallback) {
	return (node: HTMLElement) => {
		if (typeof ResizeObserver === 'undefined') {
			return;
		}
		const observer = new ResizeObserver(callback);
		observer.observe(node);
		return () => observer.disconnect();
	};
}

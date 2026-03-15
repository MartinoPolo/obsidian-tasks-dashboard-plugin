export function attachResizeObserver(callback: ResizeObserverCallback) {
	return (node: HTMLElement) => {
		if (typeof ResizeObserver === 'undefined') {
			return;
		}

		// RAF-based debounce to coalesce rapid resize events into a single layout pass
		let scheduledFrameId: number | undefined;
		let latestEntries: ResizeObserverEntry[] = [];
		let latestObserver: ResizeObserver;

		const debouncedCallback: ResizeObserverCallback = (entries, observer) => {
			latestEntries = entries;
			latestObserver = observer;
			if (scheduledFrameId !== undefined) {
				return;
			}
			scheduledFrameId = requestAnimationFrame(() => {
				scheduledFrameId = undefined;
				callback(latestEntries, latestObserver);
			});
		};

		const observer = new ResizeObserver(debouncedCallback);
		observer.observe(node);

		return () => {
			if (scheduledFrameId !== undefined) {
				cancelAnimationFrame(scheduledFrameId);
			}
			observer.disconnect();
		};
	};
}

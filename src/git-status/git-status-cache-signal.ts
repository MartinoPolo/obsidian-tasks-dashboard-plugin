/**
 * Reactive signal for git status cache updates.
 * Components use subscribeToCacheUpdates() in an $effect to re-evaluate
 * when the cache changes.
 */

type CacheUpdateListener = () => void;

const listeners = new Set<CacheUpdateListener>();

export function notifyCacheUpdate(): void {
	for (const listener of listeners) {
		listener();
	}
}

export function subscribeToCacheUpdates(listener: CacheUpdateListener): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

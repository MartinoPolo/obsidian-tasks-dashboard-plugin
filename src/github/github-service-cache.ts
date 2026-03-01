import { CacheEntry } from './github-service-types';

export interface GitHubCacheStore {
	get: <T>(key: string) => T | undefined;
	set: <T>(key: string, data: T) => void;
	delete: (key: string) => void;
	clear: () => void;
	getOrLoad: <T>(key: string, load: () => Promise<T>) => Promise<T>;
	getOrLoadOptional: <T>(key: string, load: () => Promise<T | undefined>) => Promise<T | undefined>;
}

export function createGitHubCacheStore(ttlMs: number, maxSize: number): GitHubCacheStore {
	const cache = new Map<string, CacheEntry<unknown>>();

	const get = <T>(key: string): T | undefined => {
		const entry = cache.get(key) as CacheEntry<T> | undefined;
		if (entry === undefined) {
			return undefined;
		}

		if (Date.now() - entry.timestamp > ttlMs) {
			cache.delete(key);
			return undefined;
		}

		cache.delete(key);
		cache.set(key, entry);
		return entry.data;
	};

	const set = <T>(key: string, data: T): void => {
		if (cache.size >= maxSize) {
			const oldest = cache.keys().next();
			if (oldest.done === false) {
				cache.delete(oldest.value);
			}
		}
		cache.set(key, { data, timestamp: Date.now() });
	};

	const getOrLoad = async <T>(key: string, load: () => Promise<T>): Promise<T> => {
		const cached = get<T>(key);
		if (cached !== undefined) {
			return cached;
		}

		const loaded = await load();
		set(key, loaded);
		return loaded;
	};

	const getOrLoadOptional = async <T>(
		key: string,
		load: () => Promise<T | undefined>
	): Promise<T | undefined> => {
		const cached = get<T>(key);
		if (cached !== undefined) {
			return cached;
		}

		const loaded = await load();
		if (loaded !== undefined) {
			set(key, loaded);
		}
		return loaded;
	};

	return {
		get,
		set,
		delete: (key: string): void => {
			cache.delete(key);
		},
		clear: (): void => {
			cache.clear();
		},
		getOrLoad,
		getOrLoadOptional
	};
}

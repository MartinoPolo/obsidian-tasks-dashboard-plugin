import { runGitCommandAsync, runGitCommandOutput } from '../utils/platform/process-spawn';

export interface FetchCoordinator {
	fetchOnce(repoRoot: string): Promise<void>;
	reset(): void;
}

export function resolveRepoRoot(worktreeFolder: string): string | undefined {
	const output = runGitCommandOutput(worktreeFolder, ['rev-parse', '--show-toplevel']);
	if (output === undefined) {
		return undefined;
	}
	return output.trim();
}

export function createFetchCoordinator(): FetchCoordinator {
	const inFlightFetches = new Map<string, Promise<void>>();

	const fetchOnce = (repoRoot: string): Promise<void> => {
		const existingFetch = inFlightFetches.get(repoRoot);
		if (existingFetch !== undefined) {
			return existingFetch;
		}

		const fetchPromise = runGitCommandAsync(repoRoot, ['fetch', 'origin'])
			.then(() => {
				inFlightFetches.delete(repoRoot);
			})
			.catch((error: unknown) => {
				inFlightFetches.delete(repoRoot);
				throw error;
			});

		inFlightFetches.set(repoRoot, fetchPromise);
		return fetchPromise;
	};

	const reset = (): void => {
		inFlightFetches.clear();
	};

	return { fetchOnce, reset };
}

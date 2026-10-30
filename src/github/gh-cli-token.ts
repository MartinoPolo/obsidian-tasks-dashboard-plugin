import { runCommandAsync } from '../utils/platform/process-spawn';

/**
 * Resolves a GitHub token on demand via the GitHub CLI (`gh auth token`).
 *
 * The token is never persisted to disk (data.json). It is fetched from gh's
 * OS credential store at runtime and cached in memory for the process lifetime.
 * This is the storage delegation that lets the 'gh-cli' auth method keep no
 * secret at rest inside the vault.
 */
export interface GhCliTokenResult {
	token?: string;
	error?: string;
}

let cachedResult: GhCliTokenResult | undefined;

export async function resolveGhCliToken(): Promise<GhCliTokenResult> {
	if (cachedResult?.token !== undefined) {
		return cachedResult;
	}
	const result = await resolveUncached();
	// Only cache successful resolutions so transient failures (gh not yet on
	// PATH, not logged in) are retried on the next request instead of sticking.
	if (result.token !== undefined) {
		cachedResult = result;
	}
	return result;
}

async function resolveUncached(): Promise<GhCliTokenResult> {
	try {
		const result = await runCommandAsync('gh', ['auth', 'token']);
		if (result.status === 0) {
			const token = result.stdout.trim();
			if (token.length > 0) {
				return { token };
			}
			return { error: 'GitHub CLI returned an empty token — run "gh auth login".' };
		}
		const stderr = result.stderr.trim();
		return {
			error: stderr.length > 0 ? stderr : 'GitHub CLI failed to return a token.'
		};
	} catch {
		return {
			error: 'GitHub CLI (gh) not found — install it and run "gh auth login".'
		};
	}
}

/** Clears the in-memory token cache (called when auth settings change). */
export function clearGhCliTokenCache(): void {
	cachedResult = undefined;
}

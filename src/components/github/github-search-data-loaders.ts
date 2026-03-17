import type { GitHubRepository } from '../../types';
import type { GitHubServiceInstance } from '../../github/github-service-types';

export interface SearchDataLoadersInstance {
	ensureAuthenticatedUsernameLoaded: () => Promise<void>;
	ensureUserRepositoriesLoaded: () => Promise<GitHubRepository[]>;
	getAuthenticatedUsername: () => string | undefined;
	getUserRepositories: () => GitHubRepository[] | undefined;
}

export function createSearchDataLoaders(
	githubService: GitHubServiceInstance
): SearchDataLoadersInstance {
	let authenticatedUsername: string | undefined;
	let userRepositories: GitHubRepository[] | undefined;
	let authenticatedUsernamePromise: Promise<void> | undefined;
	let userRepositoriesPromise: Promise<GitHubRepository[]> | undefined;

	async function loadAuthenticatedUsername(): Promise<void> {
		try {
			authenticatedUsername = await githubService.getAuthenticatedUser();
		} catch {
			authenticatedUsername = undefined;
		}
	}

	async function ensureAuthenticatedUsernameLoaded(): Promise<void> {
		if (githubService.isAuthenticated() === false) {
			return;
		}
		if (authenticatedUsername !== undefined) {
			return;
		}
		if (authenticatedUsernamePromise === undefined) {
			authenticatedUsernamePromise = loadAuthenticatedUsername().finally(() => {
				authenticatedUsernamePromise = undefined;
			});
		}
		await authenticatedUsernamePromise;
	}

	async function loadUserRepositories(): Promise<GitHubRepository[]> {
		try {
			userRepositories = await githubService.getUserRepositories();
		} catch {
			userRepositories = [];
		}
		return userRepositories;
	}

	async function ensureUserRepositoriesLoaded(): Promise<GitHubRepository[]> {
		if (userRepositories !== undefined) {
			return userRepositories;
		}
		if (userRepositoriesPromise === undefined) {
			userRepositoriesPromise = loadUserRepositories().finally(() => {
				userRepositoriesPromise = undefined;
			});
		}
		return userRepositoriesPromise;
	}

	function getAuthenticatedUsername(): string | undefined {
		return authenticatedUsername;
	}

	function getUserRepositories(): GitHubRepository[] | undefined {
		return userRepositories;
	}

	return {
		ensureAuthenticatedUsernameLoaded,
		ensureUserRepositoriesLoaded,
		getAuthenticatedUsername,
		getUserRepositories
	};
}

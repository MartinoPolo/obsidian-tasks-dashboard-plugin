import { Notice, requestUrl, RequestUrlResponse } from 'obsidian';
import { GitHubAuth, GitHubRateLimit } from '../types';
import { API_ACCEPT_HEADER, API_BASE, API_USER_AGENT } from './github-service-constants';
import { GitHubApiError } from './github-service-types';

interface GitHubApiErrorDetails {
	status: number | undefined;
	message: string;
}

export interface GitHubRequestClient {
	setAuth: (auth: GitHubAuth) => void;
	isAuthenticated: () => boolean;
	getRateLimit: () => GitHubRateLimit | undefined;
	apiRequest: <T>(endpoint: string) => Promise<T | undefined>;
	validateToken: () => Promise<{ valid: boolean; username?: string; error?: string }>;
}

export function createGitHubRequestClient(): GitHubRequestClient {
	let auth: GitHubAuth = { method: 'none' };
	let rateLimit: GitHubRateLimit | undefined;

	const getHeaders = (): Record<string, string> => {
		const headers: Record<string, string> = {
			Accept: API_ACCEPT_HEADER,
			'User-Agent': API_USER_AGENT
		};
		if (auth.method === 'pat' && auth.token !== undefined) {
			headers['Authorization'] = `Bearer ${auth.token}`;
		}
		return headers;
	};

	const extractErrorDetails = (error: unknown): GitHubApiErrorDetails => {
		const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';

		if (typeof error !== 'object' || error === null) {
			return { status: undefined, message: fallbackMessage };
		}

		const errorRecord = error as Record<string, unknown>;
		const status = typeof errorRecord.status === 'number' ? errorRecord.status : undefined;
		const message =
			typeof errorRecord.message === 'string' ? errorRecord.message : fallbackMessage;

		return { status, message };
	};

	const parseRateLimitHeaders = (headers: Record<string, string>): void => {
		if (
			!('x-ratelimit-limit' in headers) ||
			!('x-ratelimit-remaining' in headers) ||
			!('x-ratelimit-reset' in headers)
		) {
			return;
		}

		const parsedLimit = parseInt(headers['x-ratelimit-limit'], 10);
		const parsedRemaining = parseInt(headers['x-ratelimit-remaining'], 10);
		const parsedReset = parseInt(headers['x-ratelimit-reset'], 10);

		if (isNaN(parsedLimit) || isNaN(parsedRemaining) || isNaN(parsedReset)) {
			return;
		}

		rateLimit = {
			limit: parsedLimit,
			remaining: parsedRemaining,
			resetTimestamp: parsedReset
		};
	};

	const classifyApiError = (error: unknown): GitHubApiError => {
		const { status, message } = extractErrorDetails(error);

		if (status === 401 || status === 403) {
			const isRateLimit = status === 403 && message.includes('rate limit');
			if (isRateLimit) {
				return new GitHubApiError('rate-limit', status, 'GitHub API rate limit exceeded');
			}
			return new GitHubApiError(
				'auth',
				status,
				'GitHub authentication failed — check your token'
			);
		}

		if (status === 404) {
			return new GitHubApiError('not-found', status, 'GitHub resource not found');
		}

		return new GitHubApiError('network', status, `GitHub API request failed: ${message}`);
	};

	const isAuthenticated = (): boolean => {
		return auth.method === 'pat' && auth.token !== undefined && auth.token !== '';
	};

	const setAuth = (newAuth: GitHubAuth): void => {
		auth = newAuth;
		rateLimit = undefined;
	};

	const getRateLimit = (): GitHubRateLimit | undefined => {
		return rateLimit;
	};

	const apiRequest = async <T>(endpoint: string): Promise<T | undefined> => {
		try {
			const response: RequestUrlResponse = await requestUrl({
				url: `${API_BASE}${endpoint}`,
				headers: getHeaders()
			});
			parseRateLimitHeaders(response.headers);
			return response.json as T;
		} catch (error) {
			const apiError = classifyApiError(error);
			console.error('GitHub API error:', apiError.kind, apiError.message);

			if (apiError.kind === 'auth') {
				new Notice('GitHub: authentication failed — check your token in settings');
			} else if (apiError.kind === 'rate-limit') {
				new Notice('GitHub: API rate limit exceeded — try again later');
			} else if (apiError.kind === 'network') {
				new Notice('GitHub: request failed — check your connection');
			}

			return undefined;
		}
	};

	const validateToken = async (): Promise<{
		valid: boolean;
		username?: string;
		error?: string;
	}> => {
		if (!isAuthenticated()) {
			return { valid: false, error: 'No token configured' };
		}
		try {
			const response = await requestUrl({
				url: `${API_BASE}/user`,
				headers: getHeaders()
			});
			parseRateLimitHeaders(response.headers);
			const data = response.json as { login: string };
			return { valid: true, username: data.login };
		} catch (error) {
			const { status } = extractErrorDetails(error);
			if (status === 401) {
				return { valid: false, error: 'Invalid or expired token' };
			}
			return { valid: false, error: 'Failed to validate token' };
		}
	};

	return {
		setAuth,
		isAuthenticated,
		getRateLimit,
		apiRequest,
		validateToken
	};
}

import type { DashboardConfig, GitHubSearchScope } from '../../types';
import type {
	GitHubSearchMode,
	GitHubSearchModalLinkedRepositories
} from '../../modals/GitHubSearchModal';

export interface ScopeOption {
	value: string;
	scope: GitHubSearchScope;
	label: string;
	repository?: string;
}

export interface SearchModeLabels {
	modalTitle: string;
	searchPlaceholder: string;
	selectedResultsTitle: string;
}

export const SEARCH_DEBOUNCE_MS = 300;
export const MAX_COMBINED_RESULTS = 20;
export const RECENT_ISSUES_LIMIT = 20;
export const RECENT_ISSUES_FETCH_LIMIT = RECENT_ISSUES_LIMIT * 3;
export const TITLE_TRUNCATION_LENGTH = 50;
export const OTHER_REPOSITORY_SCOPE: GitHubSearchScope = 'other-repo';

export const SEARCH_MODE_LABELS: Record<GitHubSearchMode, SearchModeLabels> = {
	'issues-only': {
		modalTitle: 'GitHub Issue (optional)',
		searchPlaceholder: 'Search issues or paste URL...',
		selectedResultsTitle: 'Selected GitHub Issue'
	},
	'prs-only': {
		modalTitle: 'GitHub PR (optional)',
		searchPlaceholder: 'Search pull requests or paste URL...',
		selectedResultsTitle: 'Selected GitHub PR'
	},
	'issues-and-prs': {
		modalTitle: 'GitHub Issue/PR (optional)',
		searchPlaceholder: 'Search issues or paste URL...',
		selectedResultsTitle: 'Selected GitHub Issue/PR'
	}
};

export interface ResolvedSearchConfig {
	issueLinkedRepository: string | undefined;
	dashboardLinkedRepositories: string[];
	showBackButton: boolean;
	skipButtonLabel: string;
	confirmButtonLabel: string;
	selectionLockUntilCleared: boolean;
	searchMode: GitHubSearchMode;
	enterSkipsWithoutSelection: boolean;
	separateSkipAndCancelButtons: boolean;
	enterSkipLabel: string;
	showSkipButton: boolean;
	resolvedOnCancel: (() => void) | undefined;
	resolvedOnBack: (() => void) | undefined;
}

export function resolveConfig(
	dashboard: DashboardConfig,
	linkedRepositories: GitHubSearchModalLinkedRepositories | undefined,
	oncancel: (() => void) | undefined,
	onback: (() => void) | undefined
): ResolvedSearchConfig {
	const linked = linkedRepositories;
	const skip = linked?.skipButtonLabel ?? 'Cancel';
	return {
		issueLinkedRepository: linked?.issueRepository,
		dashboardLinkedRepositories: (dashboard.githubRepos ?? []).filter(
			(repo: string) => repo !== ''
		),
		showBackButton: linked?.showBackButton ?? false,
		skipButtonLabel: skip,
		confirmButtonLabel: linked?.confirmButtonLabel ?? 'Select',
		selectionLockUntilCleared: linked?.selectionLockUntilCleared ?? false,
		searchMode: linked?.searchMode ?? 'issues-and-prs',
		enterSkipsWithoutSelection: linked?.enterSkipsWithoutSelection ?? false,
		separateSkipAndCancelButtons: linked?.separateSkipAndCancelButtons ?? false,
		enterSkipLabel: linked?.enterSkipLabel ?? skip,
		showSkipButton: linked?.showSkipButton ?? true,
		resolvedOnCancel: linked?.onCancel ?? oncancel,
		resolvedOnBack: linked?.onBack ?? onback
	};
}

export function buildScopeOptions(
	issueLinkedRepository: string | undefined,
	dashboardLinkedRepositories: string[]
): ScopeOption[] {
	const options: ScopeOption[] = [];
	const issueRepo = issueLinkedRepository;

	if (issueRepo !== undefined && issueRepo !== '') {
		options.push({
			value: 'linked-issue',
			scope: 'linked-issue',
			label: `Issue linked repository (${issueRepo})`,
			repository: issueRepo
		});
	}

	for (const dashboardRepo of dashboardLinkedRepositories) {
		if (dashboardRepo === issueRepo) {
			continue;
		}
		const optionValue =
			dashboardLinkedRepositories.length > 1
				? `linked-dashboard:${dashboardRepo}`
				: 'linked-dashboard';
		options.push({
			value: optionValue,
			scope: 'linked-dashboard',
			label: `Dashboard repository (${dashboardRepo})`,
			repository: dashboardRepo
		});
	}

	options.push({
		value: 'my-repos',
		scope: 'my-repos',
		label: 'My repositories'
	});
	options.push({
		value: OTHER_REPOSITORY_SCOPE,
		scope: OTHER_REPOSITORY_SCOPE,
		label: 'Other repository'
	});

	return options;
}

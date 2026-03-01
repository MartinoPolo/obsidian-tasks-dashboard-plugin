export const DASHBOARD_MARKERS = {
	ACTIVE_START: '%% TASKS-DASHBOARD:ACTIVE:START %%',
	ACTIVE_END: '%% TASKS-DASHBOARD:ACTIVE:END %%',
	ARCHIVE_START: '%% TASKS-DASHBOARD:ARCHIVE:START %%',
	ARCHIVE_END: '%% TASKS-DASHBOARD:ARCHIVE:END %%'
} as const;

export const DASHBOARD_NOTES_MARKER = '%% TASKS-DASHBOARD:NOTES %%';

export const buildIssueMarkerStart = (issueId: string): string => {
	return `%% ISSUE:${issueId}:START %%`;
};

export const buildIssueMarkerEnd = (issueId: string): string => {
	return `%% ISSUE:${issueId}:END %%`;
};

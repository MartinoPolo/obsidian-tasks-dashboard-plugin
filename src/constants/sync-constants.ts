// Fallback for dirty worktrees and conflict cases — used when Claude Code
// terminal is spawned because in-plugin sync cannot handle the situation.
export const SYNC_COMMAND = 'claude';
export const SYNC_COMMAND_ARGS = [
	'--permission-mode',
	'acceptEdits',
	'/mp-sync-base then run: git push'
] as const;

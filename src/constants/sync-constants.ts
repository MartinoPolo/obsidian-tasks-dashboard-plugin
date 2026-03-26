export const SYNC_COMMAND = 'claude';
export const SYNC_COMMAND_ARGS = [
	'--permission-mode',
	'acceptEdits',
	'/mp-sync-base then run: git push'
] as const;

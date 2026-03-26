export type SyncStepStatus = 'pending' | 'active' | 'complete' | 'failed';

export interface SyncStep {
	label: string;
	status: SyncStepStatus;
	errorMessage?: string;
}

export type SyncStepId = 'check-conflicts' | 'merge' | 'push';

export type BranchSyncStatus =
	| 'pending'
	| 'fetching'
	| 'checking'
	| 'merging'
	| 'pushing'
	| 'done'
	| 'dirty'
	| 'conflicts'
	| 'failed';

export interface BranchSyncLine {
	branchName: string;
	status: BranchSyncStatus;
	errorMessage?: string;
}

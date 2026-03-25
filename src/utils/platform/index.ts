import type { PlatformService, ScriptPathResolver } from './platform-types';
import { pathExists } from './node-interop';
import {
	checkBranchExists,
	findWorktreePathForBranch,
	getCurrentBranch,
	getDefaultBranch,
	hasBranchUpstreamConfig,
	isGitBranchMissing,
	isGitRepositoryFolder,
	listActiveWorktrees
} from './git-operations';
import {
	openInFileExplorer,
	openTerminal,
	openTerminalWithCommand,
	openVSCode
} from './shell-launchers';
import {
	runBulkWorktreeRemovalScript,
	runWorktreeRemovalScript,
	runWorktreeSetupScript
} from './script-execution';
import { pickFile, pickFolder } from './electron-dialogs';

export type {
	FileDialogFilter,
	PlatformService,
	ScriptPathResolver,
	WorktreeEntry
} from './platform-types';

export function createPlatformService(scriptPathResolver?: ScriptPathResolver): PlatformService {
	return {
		openInFileExplorer,
		openTerminal,
		openTerminalWithCommand,
		openVSCode,
		isGitRepositoryFolder,
		isGitBranchMissing,
		pathExists,
		findWorktreePathForBranch,
		listActiveWorktrees,
		getDefaultBranch,
		getCurrentBranch,
		checkBranchExists,
		hasBranchUpstreamConfig,
		pickFolder,
		pickFile,
		runWorktreeSetupScript: (
			issueId: string,
			color?: string,
			dashboardWorkingDirectory?: string,
			bashExecutablePath?: string
		) => {
			runWorktreeSetupScript(
				scriptPathResolver,
				issueId,
				color,
				dashboardWorkingDirectory,
				bashExecutablePath
			);
		},
		runWorktreeRemovalScript: (
			issueId: string,
			dashboardWorkingDirectory?: string,
			bashExecutablePath?: string,
			options?: {
				skipConfirmation?: boolean;
				tabColor?: string;
			}
		) => {
			return runWorktreeRemovalScript(
				scriptPathResolver,
				issueId,
				dashboardWorkingDirectory,
				bashExecutablePath,
				options
			);
		},
		runBulkWorktreeRemovalScript: (
			branchNames: string[],
			dashboardWorkingDirectory?: string,
			bashExecutablePath?: string
		) => {
			return runBulkWorktreeRemovalScript(
				scriptPathResolver,
				branchNames,
				dashboardWorkingDirectory,
				bashExecutablePath
			);
		}
	};
}

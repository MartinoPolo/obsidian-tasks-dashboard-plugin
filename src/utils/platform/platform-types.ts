export interface ShellApi {
	openPath: (targetPath: string) => Promise<string>;
}

export interface ChildProcessApi {
	on: (event: 'error', listener: () => void) => ChildProcessApi;
	unref: () => void;
}

export interface SpawnApi {
	(command: string, args?: string[], options?: Record<string, unknown>): ChildProcessApi;
}

export interface FileDialogFilter {
	name: string;
	extensions: string[];
}

export interface FileDialogResult {
	canceled: boolean;
	filePaths: string[];
}

export interface RemoteDialogApi {
	showOpenDialog: (options: {
		properties: string[];
		defaultPath?: string;
		filters?: FileDialogFilter[];
	}) => Promise<FileDialogResult>;
}

export interface WorktreeEntry {
	path: string;
	branch: string | undefined;
	isBare: boolean;
}

export interface PlatformService {
	openInFileExplorer: (folderPath: string) => void;
	openTerminal: (folderPath: string, tabColor?: string) => void;
	openTerminalWithCommand: (
		folderPath: string,
		command: string,
		args: string[],
		tabColor?: string
	) => void;
	openVSCode: (folderPath: string, issueColor?: string) => void;
	isGitRepositoryFolder: (folderPath: string) => boolean;
	isGitBranchMissing: (folderPath: string, branchName: string) => boolean;
	pathExists: (targetPath: string) => boolean;
	findWorktreePathForBranch: (repositoryFolder: string, branchName: string) => string | undefined;
	listActiveWorktrees: (repositoryFolder: string) => WorktreeEntry[];
	getDefaultBranch: (repositoryFolder: string) => string | undefined;
	getCurrentBranch: (repositoryFolder: string) => string | undefined;
	checkBranchExists: (
		repositoryFolder: string,
		branchName: string
	) => 'local' | 'remote' | 'none';
	getGitRemoteUrl: (repositoryFolder: string) => string | undefined;
	hasBranchUpstreamConfig: (repositoryFolder: string, branchName: string) => boolean;
	pickFolder: (defaultPath?: string) => Promise<string | undefined>;
	pickFile: (filters?: FileDialogFilter[], defaultPath?: string) => Promise<string | undefined>;
	runWorktreeSetupScript: (
		issueId: string,
		color?: string,
		dashboardWorkingDirectory?: string,
		bashExecutablePath?: string
	) => void;
	runWorktreeRemovalScript: (
		issueId: string,
		dashboardWorkingDirectory?: string,
		bashExecutablePath?: string,
		options?: {
			skipConfirmation?: boolean;
			tabColor?: string;
		}
	) => boolean;
	runBulkWorktreeRemovalScript: (
		branchNames: string[],
		dashboardWorkingDirectory?: string,
		bashExecutablePath?: string
	) => boolean;
}

export interface ScriptPathResolver {
	resolvePluginScriptPath: (filename: string) => string;
}

export interface SpawnSyncResult {
	status: number | undefined;
	stdout: string | undefined;
}

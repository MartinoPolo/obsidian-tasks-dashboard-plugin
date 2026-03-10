import { Notice, Platform } from 'obsidian';

interface ShellApi {
	openPath: (targetPath: string) => Promise<string>;
}

interface ChildProcessApi {
	on: (event: 'error', listener: () => void) => ChildProcessApi;
	unref: () => void;
}

interface SpawnApi {
	(command: string, args?: string[], options?: Record<string, unknown>): ChildProcessApi;
}

interface FolderDialogResult {
	canceled: boolean;
	filePaths: string[];
}

interface RemoteDialogApi {
	showOpenDialog: (options: {
		properties: string[];
		defaultPath?: string;
	}) => Promise<FolderDialogResult>;
}

export interface WorktreeEntry {
	path: string;
	branch: string | undefined;
	isBare: boolean;
}

export interface PlatformService {
	openInFileExplorer: (folderPath: string) => void;
	openTerminal: (folderPath: string, tabColor?: string) => void;
	openVSCode: (folderPath: string) => void;
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
	pickFolder: (defaultPath?: string) => Promise<string | undefined>;
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
}

export function createPlatformService(): PlatformService {
	// TODO MP: Before deployment, let's remove all these absolute paths and maybe add the script to the project.
	const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
	const WORKTREE_SETUP_SCRIPT = 'C:\\_MP_projects\\mxp-claude-code\\scripts\\setup-worktree.sh';
	const WORKTREE_REMOVE_SCRIPT = 'C:\\_MP_projects\\mxp-claude-code\\scripts\\remove-worktree.sh';
	const WINDOWS_GIT_BASH_CANDIDATES = [
		'C:\\_MP_apps\\Git\\bin\\bash.exe',
		'C:\\Program Files\\Git\\bin\\bash.exe',
		'C:\\_MP_apps\\Git\\git-bash.exe',
		'C:\\Program Files\\Git\\git-bash.exe'
	];
	const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
		return typeof value === 'object' && value !== null;
	};

	const loadModule = (moduleName: string): unknown => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const loadedModule: unknown = require(moduleName);
		return loadedModule;
	};

	const getRequiredFunction = (
		moduleValue: unknown,
		functionName: string
	): ((...args: unknown[]) => unknown) => {
		if (!isObjectRecord(moduleValue)) {
			throw new Error('Invalid module value');
		}

		const candidateFunction = moduleValue[functionName];
		if (typeof candidateFunction !== 'function') {
			throw new Error(`Module function not found: ${functionName}`);
		}

		return (...args: unknown[]) => {
			const result: unknown = Reflect.apply(candidateFunction, moduleValue, args);
			return result;
		};
	};

	const isPromiseString = (value: unknown): value is Promise<string> => {
		if (!isObjectRecord(value)) {
			return false;
		}

		return typeof value.then === 'function';
	};

	const getShell = (): ShellApi => {
		const electronModule = loadModule('electron');
		if (!isObjectRecord(electronModule)) {
			throw new Error('Invalid electron module');
		}

		const shellValue = electronModule.shell;
		if (!isObjectRecord(shellValue)) {
			throw new Error('Invalid electron shell');
		}

		const openPathFunction = getRequiredFunction(shellValue, 'openPath');
		return {
			openPath: (targetPath: string) => {
				const openPathResult = openPathFunction(targetPath);
				if (isPromiseString(openPathResult)) {
					return openPathResult;
				}

				return Promise.resolve('');
			}
		};
	};

	const toChildProcessApi = (processCandidate: unknown): ChildProcessApi => {
		if (!isObjectRecord(processCandidate)) {
			throw new Error('Invalid child process');
		}

		const onCandidate = processCandidate.on;
		const unrefCandidate = processCandidate.unref;
		if (typeof onCandidate !== 'function' || typeof unrefCandidate !== 'function') {
			throw new Error('Invalid child process methods');
		}

		return {
			on: (event: 'error', listener: () => void) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const onResult = onCandidate.call(processCandidate, event, listener);
				return toChildProcessApi(onResult);
			},
			unref: () => {
				unrefCandidate.call(processCandidate);
			}
		};
	};

	const getSpawn = (): SpawnApi => {
		const childProcessModule = loadModule('child_process');
		const spawnFunction = getRequiredFunction(childProcessModule, 'spawn');

		return (
			command: string,
			args?: string[],
			options?: Record<string, unknown>
		): ChildProcessApi => {
			const spawnedProcess = spawnFunction(command, args, options);
			return toChildProcessApi(spawnedProcess);
		};
	};

	const runGitCommandStatus = (folderPath: string, args: string[]): number | undefined => {
		try {
			const childProcessModule = loadModule('child_process');
			const spawnSyncFunction = getRequiredFunction(childProcessModule, 'spawnSync');
			const spawnResult = spawnSyncFunction('git', args, {
				shell: false,
				cwd: folderPath,
				windowsHide: true
			});
			if (!isObjectRecord(spawnResult)) {
				return undefined;
			}

			const statusCandidate = spawnResult.status;
			if (typeof statusCandidate !== 'number') {
				return undefined;
			}

			return statusCandidate;
		} catch {
			return undefined;
		}
	};

	const runGitCommandOutput = (folderPath: string, args: string[]): string | undefined => {
		try {
			const childProcessModule = loadModule('child_process');
			const spawnSyncFunction = getRequiredFunction(childProcessModule, 'spawnSync');
			const spawnResult = spawnSyncFunction('git', args, {
				shell: false,
				cwd: folderPath,
				windowsHide: true,
				encoding: 'utf8'
			});
			if (!isObjectRecord(spawnResult)) {
				return undefined;
			}

			const statusCandidate = spawnResult.status;
			if (typeof statusCandidate !== 'number' || statusCandidate !== 0) {
				return undefined;
			}

			const stdoutCandidate = spawnResult.stdout;
			if (typeof stdoutCandidate !== 'string') {
				return undefined;
			}

			return stdoutCandidate;
		} catch {
			return undefined;
		}
	};

	const isFolderDialogResult = (value: unknown): value is FolderDialogResult => {
		if (!isObjectRecord(value)) {
			return false;
		}

		const canceled = value.canceled;
		const filePaths = value.filePaths;
		if (typeof canceled !== 'boolean' || !Array.isArray(filePaths)) {
			return false;
		}

		for (const filePath of filePaths) {
			if (typeof filePath !== 'string') {
				return false;
			}
		}

		return true;
	};

	const getRemoteDialog = (): RemoteDialogApi => {
		const remoteModule = loadModule('@electron/remote');
		if (!isObjectRecord(remoteModule)) {
			throw new Error('Invalid remote module');
		}

		const dialogCandidate = remoteModule.dialog;
		if (!isObjectRecord(dialogCandidate)) {
			throw new Error('Invalid remote dialog module');
		}

		const showOpenDialogFunction = getRequiredFunction(dialogCandidate, 'showOpenDialog');
		return {
			showOpenDialog: async (options: {
				properties: string[];
				defaultPath?: string;
			}): Promise<FolderDialogResult> => {
				const dialogResult = await showOpenDialogFunction(options);
				if (!isFolderDialogResult(dialogResult)) {
					throw new Error('Invalid folder dialog result');
				}

				return dialogResult;
			}
		};
	};

	const notifyOnSpawnError = (childProcess: ChildProcessApi, message: string): void => {
		childProcess.on('error', () => {
			new Notice(message);
		});
	};

	const openInFileExplorer = (folderPath: string): void => {
		void getShell().openPath(folderPath);
	};

	const isValidHexColor = (color: string): boolean => HEX_COLOR_PATTERN.test(color);

	const openTerminal = (folderPath: string, tabColor?: string): void => {
		const spawn = getSpawn();

		if (Platform.isWin) {
			const spawnArguments = ['-w', '0', 'nt', '-d', folderPath];
			if (tabColor !== undefined && isValidHexColor(tabColor)) {
				spawnArguments.push('--tabColor', tabColor);
			}
			notifyOnSpawnError(
				spawn('wt', spawnArguments, { shell: false, cwd: folderPath }),
				'Could not open Windows Terminal — is it installed?'
			);
		} else if (Platform.isMacOS) {
			notifyOnSpawnError(
				spawn('open', ['-a', 'Terminal', folderPath], { shell: false }),
				'Could not open Terminal'
			);
		} else {
			const terminalProcess = spawn(
				'x-terminal-emulator',
				['--working-directory', folderPath],
				{ shell: false }
			);
			terminalProcess.on('error', () => {
				// Fallback to xterm if x-terminal-emulator is not available
				notifyOnSpawnError(
					spawn('xterm', [], { shell: false, cwd: folderPath }),
					'Could not open terminal — no terminal emulator found'
				);
			});
		}
	};

	const openVSCode = (folderPath: string): void => {
		const spawn = getSpawn();
		const child = spawn('code', [folderPath], {
			shell: process.platform === 'win32',
			cwd: folderPath,
			detached: true,
			stdio: 'ignore'
		});
		child.unref();
		notifyOnSpawnError(child, 'Could not open VS Code — is it installed and in PATH?');
	};

	const isGitRepositoryFolder = (folderPath: string): boolean => {
		if (folderPath.trim() === '') {
			return false;
		}

		try {
			const fsModule = loadModule('fs');
			const existsSyncFunction = getRequiredFunction(fsModule, 'existsSync');
			const normalizedPath = folderPath.replace(/[\\/]+$/, '');
			const gitPath = `${normalizedPath}/.git`;
			// .git can be a directory (regular repo) or a file (worktree)
			return existsSyncFunction(gitPath) === true;
		} catch {
			return false;
		}
	};

	const listActiveWorktrees = (repositoryFolder: string): WorktreeEntry[] => {
		if (repositoryFolder.trim() === '' || !isGitRepositoryFolder(repositoryFolder)) {
			return [];
		}

		const output = runGitCommandOutput(repositoryFolder, ['worktree', 'list', '--porcelain']);
		if (output === undefined || output.trim() === '') {
			return [];
		}

		const entries: WorktreeEntry[] = [];
		let currentPath: string | undefined;
		let currentBranch: string | undefined;
		let isBare = false;
		const lines = output.split(/\r?\n/);

		for (const line of lines) {
			const trimmedLine = line.trim();
			if (trimmedLine === '') {
				if (currentPath !== undefined) {
					entries.push({ path: currentPath, branch: currentBranch, isBare });
				}
				currentPath = undefined;
				currentBranch = undefined;
				isBare = false;
				continue;
			}

			if (trimmedLine.startsWith('worktree ')) {
				currentPath = trimmedLine.slice('worktree '.length).trim();
				continue;
			}

			if (trimmedLine.startsWith('branch refs/heads/')) {
				currentBranch = trimmedLine.slice('branch refs/heads/'.length).trim();
				continue;
			}

			if (trimmedLine === 'bare') {
				isBare = true;
			}
		}

		// Handle final entry without trailing empty line
		if (currentPath !== undefined) {
			entries.push({ path: currentPath, branch: currentBranch, isBare });
		}

		return entries;
	};

	const getDefaultBranch = (repositoryFolder: string): string | undefined => {
		if (repositoryFolder.trim() === '' || !isGitRepositoryFolder(repositoryFolder)) {
			return undefined;
		}

		// Try symbolic-ref for origin HEAD first
		const symbolicRefOutput = runGitCommandOutput(repositoryFolder, [
			'symbolic-ref',
			'refs/remotes/origin/HEAD',
			'--short'
		]);
		if (symbolicRefOutput !== undefined && symbolicRefOutput.trim() !== '') {
			const trimmed = symbolicRefOutput.trim();
			// Output is like "origin/main" — strip the "origin/" prefix
			const slashIndex = trimmed.indexOf('/');
			if (slashIndex !== -1) {
				return trimmed.slice(slashIndex + 1);
			}
			return trimmed;
		}

		// Fall back to current HEAD branch
		const headOutput = runGitCommandOutput(repositoryFolder, [
			'rev-parse',
			'--abbrev-ref',
			'HEAD'
		]);
		if (headOutput !== undefined && headOutput.trim() !== '' && headOutput.trim() !== 'HEAD') {
			return headOutput.trim();
		}

		return undefined;
	};

	const pathExists = (targetPath: string): boolean => {
		if (targetPath.trim() === '') {
			return false;
		}

		try {
			const fsModule = loadModule('fs');
			const existsSyncFunction = getRequiredFunction(fsModule, 'existsSync');
			return existsSyncFunction(targetPath) === true;
		} catch {
			return false;
		}
	};

	const findWorktreePathForBranch = (
		repositoryFolder: string,
		branchName: string
	): string | undefined => {
		if (repositoryFolder.trim() === '' || branchName.trim() === '') {
			return undefined;
		}
		if (!isGitRepositoryFolder(repositoryFolder)) {
			return undefined;
		}

		const output = runGitCommandOutput(repositoryFolder, ['worktree', 'list', '--porcelain']);
		if (output === undefined || output.trim() === '') {
			return undefined;
		}

		let currentWorktreePath: string | undefined;
		let currentBranch: string | undefined;
		const lines = output.split(/\r?\n/);
		for (const line of lines) {
			const trimmedLine = line.trim();
			if (trimmedLine === '') {
				if (currentBranch === branchName && currentWorktreePath !== undefined) {
					return currentWorktreePath;
				}
				currentWorktreePath = undefined;
				currentBranch = undefined;
				continue;
			}

			if (trimmedLine.startsWith('worktree ')) {
				currentWorktreePath = trimmedLine.slice('worktree '.length).trim();
				continue;
			}

			if (trimmedLine.startsWith('branch refs/heads/')) {
				currentBranch = trimmedLine.slice('branch refs/heads/'.length).trim();
			}
		}

		if (currentBranch === branchName && currentWorktreePath !== undefined) {
			return currentWorktreePath;
		}

		return undefined;
	};

	const isGitBranchMissing = (folderPath: string, branchName: string): boolean => {
		if (folderPath.trim() === '' || branchName.trim() === '') {
			return false;
		}
		if (!isGitRepositoryFolder(folderPath)) {
			return false;
		}

		const gitVersionStatus = runGitCommandStatus(folderPath, ['--version']);
		if (gitVersionStatus !== 0) {
			return false;
		}

		const localBranchStatus = runGitCommandStatus(folderPath, [
			'rev-parse',
			'--verify',
			'--quiet',
			`refs/heads/${branchName}`
		]);
		if (localBranchStatus === 0) {
			return false;
		}

		const remoteBranchStatus = runGitCommandStatus(folderPath, [
			'rev-parse',
			'--verify',
			'--quiet',
			`refs/remotes/origin/${branchName}`
		]);
		return remoteBranchStatus !== 0;
	};

	const pickFolder = async (defaultPath?: string): Promise<string | undefined> => {
		try {
			const remoteDialog = getRemoteDialog();
			const result = await remoteDialog.showOpenDialog({
				properties: ['openDirectory'],
				defaultPath
			});
			if (result.canceled || result.filePaths.length === 0) {
				return undefined;
			}
			return result.filePaths[0];
		} catch {
			new Notice('Could not open folder picker');
			return undefined;
		}
	};

	const toWindowsBashPath = (pathValue: string): string => {
		const normalizedPath = pathValue.replace(/\\/g, '/');
		const windowsPathMatch = normalizedPath.match(/^([A-Za-z]):\/(.*)$/);
		if (windowsPathMatch === null) {
			return normalizedPath;
		}

		const driveLetter = windowsPathMatch[1].toLowerCase();
		const remainingPath = windowsPathMatch[2];
		return `/${driveLetter}/${remainingPath}`;
	};

	const toBashSingleQuoted = (value: string): string => {
		return `'${value.replace(/'/g, `'\\''`)}'`;
	};

	const getScriptWorkingDirectory = (scriptPath: string): string => {
		return scriptPath.replace(/\\scripts\\[^\\]+$/, '');
	};

	const resolveScriptWorkingDirectory = (
		scriptPath: string,
		dashboardWorkingDirectory?: string
	): string => {
		if (dashboardWorkingDirectory !== undefined && dashboardWorkingDirectory.trim() !== '') {
			return dashboardWorkingDirectory;
		}

		return getScriptWorkingDirectory(scriptPath);
	};

	const resolveWindowsBashExecutable = (configuredPath?: string): string | undefined => {
		if (!Platform.isWin) {
			return undefined;
		}

		const fsModule = loadModule('fs');
		const existsSyncFunction = getRequiredFunction(fsModule, 'existsSync');
		if (configuredPath !== undefined && configuredPath.trim() !== '') {
			return configuredPath;
		}

		const bashCandidates = WINDOWS_GIT_BASH_CANDIDATES;
		for (const bashCandidate of bashCandidates) {
			const existsResult = existsSyncFunction(bashCandidate);
			if (existsResult === true) {
				return bashCandidate;
			}
		}

		return undefined;
	};

	const buildBashCommand = (scriptPath: string, args: string[]): string => {
		const quotedScriptPath = toBashSingleQuoted(toWindowsBashPath(scriptPath));
		const quotedArgs = args.map((arg) => toBashSingleQuoted(arg));
		return ['bash', quotedScriptPath, ...quotedArgs].join(' ');
	};

	const buildInteractiveWindowsScriptCommand = (scriptPath: string, args: string[]): string => {
		const scriptCommand = buildBashCommand(scriptPath, args);
		return `(${scriptCommand} && echo setup_worktree_completed || echo setup_worktree_failed_exit_${'$'}?) && bash -i || bash -i`;
	};

	const runScriptWithBash = (
		scriptPath: string,
		args: string[],
		errorMessage: string,
		dashboardWorkingDirectory?: string,
		bashExecutablePath?: string,
		terminalTabColor?: string
	): boolean => {
		const spawn = getSpawn();
		const workingDirectory = resolveScriptWorkingDirectory(
			scriptPath,
			dashboardWorkingDirectory
		);
		if (Platform.isWin) {
			const bashExecutable = resolveWindowsBashExecutable(bashExecutablePath);
			if (bashExecutable === undefined) {
				new Notice(
					'Bash executable was not found. Install/configure bash to avoid fallback.'
				);
				return false;
			}

			const isGitBashTerminal = bashExecutable.toLowerCase().endsWith('git-bash.exe');
			const bashArgs = isGitBashTerminal
				? [
						`--cd=${workingDirectory}`,
						'-i',
						'-l',
						'-c',
						buildInteractiveWindowsScriptCommand(scriptPath, args)
					]
				: ['-i', '-l', '-c', buildInteractiveWindowsScriptCommand(scriptPath, args)];
			const windowsTerminalArgs = ['-w', '0', 'nt', '-d', workingDirectory];
			if (terminalTabColor !== undefined && isValidHexColor(terminalTabColor)) {
				windowsTerminalArgs.push('--tabColor', terminalTabColor);
			}
			windowsTerminalArgs.push(bashExecutable, ...bashArgs);
			const childProcess = spawn('wt', windowsTerminalArgs, {
				shell: false,
				cwd: workingDirectory
			});
			notifyOnSpawnError(childProcess, errorMessage);
			return true;
		}

		const childProcess = spawn('bash', [scriptPath, ...args], {
			shell: false,
			cwd: workingDirectory
		});
		notifyOnSpawnError(childProcess, errorMessage);
		return true;
	};

	const runWorktreeSetupScript = (
		issueId: string,
		color?: string,
		dashboardWorkingDirectory?: string,
		bashExecutablePath?: string
	): void => {
		const scriptArgs = [issueId];
		if (color !== undefined && color !== '' && isValidHexColor(color)) {
			scriptArgs.push('--color', color);
		}
		runScriptWithBash(
			WORKTREE_SETUP_SCRIPT,
			scriptArgs,
			'Could not run setup-worktree script',
			dashboardWorkingDirectory,
			bashExecutablePath,
			color
		);
	};

	const runWorktreeRemovalScript = (
		issueId: string,
		dashboardWorkingDirectory?: string,
		bashExecutablePath?: string,
		options?: {
			skipConfirmation?: boolean;
			tabColor?: string;
		}
	): boolean => {
		const scriptArgs = [issueId];
		if (options?.skipConfirmation === true) {
			scriptArgs.push('--skip-confirmation');
		}

		return runScriptWithBash(
			WORKTREE_REMOVE_SCRIPT,
			scriptArgs,
			'Could not run remove-worktree script',
			dashboardWorkingDirectory,
			bashExecutablePath,
			options?.tabColor
		);
	};

	const getCurrentBranch = (repositoryFolder: string): string | undefined => {
		if (repositoryFolder.trim() === '' || !isGitRepositoryFolder(repositoryFolder)) {
			return undefined;
		}

		const output = runGitCommandOutput(repositoryFolder, ['rev-parse', '--abbrev-ref', 'HEAD']);
		if (output === undefined || output.trim() === '' || output.trim() === 'HEAD') {
			return undefined;
		}

		return output.trim();
	};

	const checkBranchExists = (
		repositoryFolder: string,
		branchName: string
	): 'local' | 'remote' | 'none' => {
		if (repositoryFolder.trim() === '' || branchName.trim() === '') {
			return 'none';
		}
		if (!isGitRepositoryFolder(repositoryFolder)) {
			return 'none';
		}

		const localStatus = runGitCommandStatus(repositoryFolder, [
			'rev-parse',
			'--verify',
			'--quiet',
			`refs/heads/${branchName}`
		]);
		if (localStatus === 0) {
			return 'local';
		}

		const remoteStatus = runGitCommandStatus(repositoryFolder, [
			'rev-parse',
			'--verify',
			'--quiet',
			`refs/remotes/origin/${branchName}`
		]);
		if (remoteStatus === 0) {
			return 'remote';
		}

		return 'none';
	};

	return {
		openInFileExplorer,
		openTerminal,
		openVSCode,
		isGitRepositoryFolder,
		isGitBranchMissing,
		pathExists,
		findWorktreePathForBranch,
		listActiveWorktrees,
		getDefaultBranch,
		getCurrentBranch,
		checkBranchExists,
		pickFolder,
		runWorktreeSetupScript,
		runWorktreeRemovalScript
	};
}

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
	showOpenDialog: (options: { properties: string[]; defaultPath?: string }) => Promise<FolderDialogResult>;
}

export interface PlatformService {
	openInFileExplorer: (folderPath: string) => void;
	openTerminal: (folderPath: string, tabColor?: string) => void;
	openVSCode: (folderPath: string) => void;
	pickFolder: (defaultPath?: string) => Promise<string | undefined>;
}

export function createPlatformService(): PlatformService {
	const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
	const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
		return typeof value === 'object' && value !== null;
	};

	const loadModule = (moduleName: string): unknown => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const loadedModule: unknown = require(moduleName);
		return loadedModule;
	};

	const getRequiredFunction = (moduleValue: unknown, functionName: string): ((...args: unknown[]) => unknown) => {
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

		return (command: string, args?: string[], options?: Record<string, unknown>): ChildProcessApi => {
			const spawnedProcess = spawnFunction(command, args, options);
			return toChildProcessApi(spawnedProcess);
		};
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
			showOpenDialog: async (options: { properties: string[]; defaultPath?: string }): Promise<FolderDialogResult> => {
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
			notifyOnSpawnError(spawn('open', ['-a', 'Terminal', folderPath], { shell: false }), 'Could not open Terminal');
		} else {
			const terminalProcess = spawn('x-terminal-emulator', ['--working-directory', folderPath], { shell: false });
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
		const child = spawn('code', [folderPath], { shell: process.platform === 'win32', cwd: folderPath, detached: true, stdio: 'ignore' });
		child.unref();
		notifyOnSpawnError(child, 'Could not open VS Code — is it installed and in PATH?');
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

	return { openInFileExplorer, openTerminal, openVSCode, pickFolder };
}

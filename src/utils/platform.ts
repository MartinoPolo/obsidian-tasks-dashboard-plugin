import { Notice, Platform } from 'obsidian';

export interface PlatformService {
	openInFileExplorer: (folderPath: string) => void;
	openTerminal: (folderPath: string, tabColor?: string) => void;
	openVSCode: (folderPath: string) => void;
	pickFolder: (defaultPath?: string) => Promise<string | undefined>;
}

export function createPlatformService(): PlatformService {
	const openInFileExplorer = (folderPath: string): void => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
		const { shell } = require('electron');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
		void shell.openPath(folderPath);
	};

	const isValidHexColor = (color: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(color);

	const openTerminal = (folderPath: string, tabColor?: string): void => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
		const { spawn } = require('child_process');

		if (Platform.isWin) {
			const spawnArguments = ['-w', '0', 'nt', '-d', folderPath];
			if (tabColor !== undefined && isValidHexColor(tabColor)) {
				spawnArguments.push('--tabColor', tabColor);
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			spawn('wt', spawnArguments, { shell: false, cwd: folderPath }).on('error', () => {
				new Notice('Could not open Windows Terminal — is it installed?');
			});
		} else if (Platform.isMacOS) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
			spawn('open', ['-a', 'Terminal', folderPath], { shell: false }).on('error', () => {
				new Notice('Could not open Terminal');
			});
		} else {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
			const terminalProcess = spawn('x-terminal-emulator', ['--working-directory', folderPath], { shell: false });
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			terminalProcess.on('error', () => {
				// Fallback to xterm if x-terminal-emulator is not available
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
				spawn('xterm', [], { shell: false, cwd: folderPath }).on('error', () => {
					new Notice('Could not open terminal — no terminal emulator found');
				});
			});
		}
	};

	const openVSCode = (folderPath: string): void => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
		const { spawn } = require('child_process');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
		spawn('code', [folderPath], { shell: false, cwd: folderPath }).on('error', () => {
			new Notice('Could not open VS Code — is it installed and in PATH?');
		});
	};

	const pickFolder = async (defaultPath?: string): Promise<string | undefined> => {
		try {
			// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
			const remote = require('@electron/remote');
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
			const result = await remote.dialog.showOpenDialog({
				properties: ['openDirectory'],
				defaultPath
			});
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (result.canceled || result.filePaths.length === 0) {
				return undefined;
			}
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			return result.filePaths[0] as string;
		} catch {
			new Notice('Could not open folder picker');
			return undefined;
		}
	};

	return { openInFileExplorer, openTerminal, openVSCode, pickFolder };
}

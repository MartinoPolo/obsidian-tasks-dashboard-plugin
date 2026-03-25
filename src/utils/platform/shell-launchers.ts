import { Platform } from 'obsidian';

import { getRequiredFunction, getShell, loadModule } from './node-interop';
import { getSpawn, notifyOnSpawnError } from './process-spawn';

const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** Escape a string for safe embedding in a single-quoted shell argument. */
const escapeShellArgument = (arg: string): string => {
	return "'" + arg.replace(/'/g, "'\\''") + "'";
};

export const isValidHexColor = (color: string): boolean => HEX_COLOR_PATTERN.test(color);

export const openInFileExplorer = (folderPath: string): void => {
	void getShell().openPath(folderPath);
};

export const openTerminal = (folderPath: string, tabColor?: string): void => {
	const spawn = getSpawn();

	if (Platform.isWin) {
		const spawnArguments = ['-w', '0', 'nt', '-d', folderPath];
		if (tabColor !== undefined && isValidHexColor(tabColor)) {
			spawnArguments.push('--tabColor', tabColor);
		}
		notifyOnSpawnError(
			spawn('wt', spawnArguments, { shell: false, cwd: folderPath }),
			'Could not open Windows Terminal -- is it installed?'
		);
	} else if (Platform.isMacOS) {
		notifyOnSpawnError(
			spawn('open', ['-a', 'Terminal', folderPath], { shell: false }),
			'Could not open Terminal'
		);
	} else {
		const terminalProcess = spawn('x-terminal-emulator', ['--working-directory', folderPath], {
			shell: false
		});
		terminalProcess.on('error', () => {
			// Fallback to xterm if x-terminal-emulator is not available
			notifyOnSpawnError(
				spawn('xterm', [], { shell: false, cwd: folderPath }),
				'Could not open terminal -- no terminal emulator found'
			);
		});
	}
};

export const openTerminalWithCommand = (
	folderPath: string,
	command: string,
	args: string[],
	tabColor?: string
): void => {
	const spawn = getSpawn();

	if (Platform.isWin) {
		// Windows Terminal: wt -w 0 nt -d <folder> [--tabColor <color>] <command> <args...>
		const spawnArguments = ['-w', '0', 'nt', '-d', folderPath];
		if (tabColor !== undefined && isValidHexColor(tabColor)) {
			spawnArguments.push('--tabColor', tabColor);
		}
		spawnArguments.push(command, ...args);
		notifyOnSpawnError(
			spawn('wt', spawnArguments, { shell: false, cwd: folderPath }),
			'Could not open Windows Terminal -- is it installed?'
		);
	} else if (Platform.isMacOS) {
		// macOS: launch command directly in terminal via osascript
		const escapedFolder = escapeShellArgument(folderPath);
		const escapedCommand = [command, ...args].map(escapeShellArgument).join(' ');
		const script = `cd ${escapedFolder} && ${escapedCommand}`;
		const escapedScript = script.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
		notifyOnSpawnError(
			spawn(
				'osascript',
				['-e', `tell application "Terminal" to do script "${escapedScript}"`],
				{ shell: false }
			),
			'Could not open Terminal'
		);
	} else {
		// Linux: pass command and args as separate spawn arguments
		const terminalProcess = spawn(
			'x-terminal-emulator',
			['--working-directory', folderPath, '-e', command, ...args],
			{ shell: false }
		);
		terminalProcess.on('error', () => {
			notifyOnSpawnError(
				spawn('xterm', ['-e', command, ...args], { shell: false, cwd: folderPath }),
				'Could not open terminal -- no terminal emulator found'
			);
		});
	}
};

export const ensurePeacockColor = (folderPath: string, issueColor: string): void => {
	try {
		const fsModule = loadModule('fs');
		const pathModule = loadModule('path');
		const joinFunction = getRequiredFunction(pathModule, 'join');
		const existsSyncFunction = getRequiredFunction(fsModule, 'existsSync');
		const readFileSyncFunction = getRequiredFunction(fsModule, 'readFileSync');
		const writeFileSyncFunction = getRequiredFunction(fsModule, 'writeFileSync');
		const mkdirSyncFunction = getRequiredFunction(fsModule, 'mkdirSync');

		const vscodeDir = joinFunction(folderPath, '.vscode') as string;
		const settingsPath = joinFunction(vscodeDir, 'settings.json') as string;

		let settings: Record<string, unknown> = {};
		if (existsSyncFunction(settingsPath) === true) {
			const content = readFileSyncFunction(settingsPath, 'utf8') as string;
			const parsed: unknown = JSON.parse(content);
			if (typeof parsed === 'object' && parsed !== null) {
				settings = parsed as Record<string, unknown>;
			}
		}

		if (settings['peacock.color'] === issueColor) {
			return;
		}

		settings['peacock.color'] = issueColor;
		if (existsSyncFunction(vscodeDir) !== true) {
			mkdirSyncFunction(vscodeDir, { recursive: true });
		}
		writeFileSyncFunction(settingsPath, JSON.stringify(settings, null, '\t') + '\n');
	} catch {
		// Silent failure -- don't corrupt user settings
	}
};

export const openVSCode = (folderPath: string, issueColor?: string): void => {
	if (issueColor !== undefined && isValidHexColor(issueColor)) {
		ensurePeacockColor(folderPath, issueColor);
	}
	const spawn = getSpawn();
	// shell: true required on Windows -- `code` is a .cmd batch wrapper, not an executable
	const child = spawn('code', [folderPath], {
		shell: Platform.isWin,
		cwd: folderPath,
		detached: true,
		stdio: 'ignore'
	});
	child.unref();
	notifyOnSpawnError(child, 'Could not open VS Code -- is it installed and in PATH?');
};

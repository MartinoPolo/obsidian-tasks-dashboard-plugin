import { Notice, Platform } from 'obsidian';

import type { ScriptPathResolver } from './platform-types';
import { getRequiredFunction, loadModule } from './node-interop';
import { getSpawn, notifyOnSpawnError } from './process-spawn';
import { isValidHexColor } from './shell-launchers';

export const WINDOWS_GIT_BASH_CANDIDATES = [
	'C:\\_MP_apps\\Git\\bin\\bash.exe',
	'C:\\Program Files\\Git\\bin\\bash.exe',
	'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
	'C:\\_MP_apps\\Git\\git-bash.exe',
	'C:\\Program Files\\Git\\git-bash.exe',
	'C:\\Program Files (x86)\\Git\\git-bash.exe'
];

const UNSAFE_SCRIPT_ARGUMENT_PATTERN = /[\0\n\r\t `$|&;><(){}/\\]/;

export const isUnsafeScriptArgument = (value: string): boolean => {
	return (
		value.trim() === '' || value.includes('..') || UNSAFE_SCRIPT_ARGUMENT_PATTERN.test(value)
	);
};

export const toWindowsBashPath = (pathValue: string): string => {
	const normalizedPath = pathValue.replace(/\\/g, '/');
	const windowsPathMatch = normalizedPath.match(/^([A-Za-z]):\/(.*)$/);
	if (windowsPathMatch === null) {
		return normalizedPath;
	}

	const driveLetter = windowsPathMatch[1].toLowerCase();
	const remainingPath = windowsPathMatch[2];
	return `/${driveLetter}/${remainingPath}`;
};

export const toBashSingleQuoted = (value: string): string => {
	return `'${value.replace(/'/g, `'\\''`)}'`;
};

export const getScriptWorkingDirectory = (scriptPath: string): string => {
	return scriptPath.replace(/\\scripts\\[^\\]+$/, '');
};

export const resolveScriptWorkingDirectory = (
	scriptPath: string,
	dashboardWorkingDirectory?: string
): string => {
	if (dashboardWorkingDirectory !== undefined && dashboardWorkingDirectory.trim() !== '') {
		return dashboardWorkingDirectory;
	}

	return getScriptWorkingDirectory(scriptPath);
};

export const resolveWindowsBashExecutable = (configuredPath?: string): string | undefined => {
	if (!Platform.isWin) {
		return undefined;
	}

	const fsModule = loadModule('fs');
	const existsSyncFunction = getRequiredFunction(fsModule, 'existsSync');
	if (configuredPath !== undefined && configuredPath.trim() !== '') {
		return configuredPath;
	}

	for (const bashCandidate of WINDOWS_GIT_BASH_CANDIDATES) {
		const existsResult = existsSyncFunction(bashCandidate);
		if (existsResult === true) {
			return bashCandidate;
		}
	}

	return undefined;
};

export const buildBashCommand = (scriptPath: string, args: string[]): string => {
	const quotedScriptPath = toBashSingleQuoted(toWindowsBashPath(scriptPath));
	const quotedArgs = args.map((arg) => toBashSingleQuoted(arg));
	return ['bash', quotedScriptPath, ...quotedArgs].join(' ');
};

export const buildInteractiveWindowsScriptCommand = (
	scriptPath: string,
	args: string[]
): string => {
	const scriptCommand = buildBashCommand(scriptPath, args);
	return `(${scriptCommand} && echo script_completed || echo script_failed_exit_${'$'}?) && bash -i || bash -i`;
};

export const runScriptWithBash = (
	scriptPath: string,
	args: string[],
	errorMessage: string,
	dashboardWorkingDirectory?: string,
	bashExecutablePath?: string,
	terminalTabColor?: string
): boolean => {
	const spawn = getSpawn();
	const workingDirectory = resolveScriptWorkingDirectory(scriptPath, dashboardWorkingDirectory);
	if (Platform.isWin) {
		const bashExecutable = resolveWindowsBashExecutable(bashExecutablePath);
		if (bashExecutable === undefined) {
			new Notice('Bash executable was not found. Install/configure bash to avoid fallback.');
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

export const runWorktreeSetupScript = (
	scriptPathResolver: ScriptPathResolver | undefined,
	issueId: string,
	color?: string,
	dashboardWorkingDirectory?: string,
	bashExecutablePath?: string
): void => {
	if (isUnsafeScriptArgument(issueId)) {
		new Notice('Invalid issue ID -- contains forbidden characters.');
		return;
	}

	if (scriptPathResolver === undefined) {
		new Notice('Worktree scripts not available -- plugin path could not be resolved.');
		return;
	}

	const setupScriptPath = scriptPathResolver.resolvePluginScriptPath('setup-worktree.sh');

	const scriptArgs = [issueId];
	if (color !== undefined && color !== '' && isValidHexColor(color)) {
		scriptArgs.push('--color', color);
	}
	runScriptWithBash(
		setupScriptPath,
		scriptArgs,
		'Could not run setup-worktree script',
		dashboardWorkingDirectory,
		bashExecutablePath,
		color
	);
};

export const runBulkWorktreeRemovalScript = (
	scriptPathResolver: ScriptPathResolver | undefined,
	branchNames: string[],
	dashboardWorkingDirectory?: string,
	bashExecutablePath?: string
): boolean => {
	for (const name of branchNames) {
		if (isUnsafeScriptArgument(name)) {
			new Notice(`Invalid branch name -- contains forbidden characters.`);
			return false;
		}
	}

	if (scriptPathResolver === undefined) {
		new Notice('Worktree scripts not available -- plugin path could not be resolved.');
		return false;
	}

	const removeScriptPath = scriptPathResolver.resolvePluginScriptPath('remove-worktree.sh');
	const scriptArgs = ['--skip-confirmation', ...branchNames];

	return runScriptWithBash(
		removeScriptPath,
		scriptArgs,
		'Could not run remove-worktree script',
		dashboardWorkingDirectory,
		bashExecutablePath
	);
};

export const runWorktreeRemovalScript = (
	scriptPathResolver: ScriptPathResolver | undefined,
	issueId: string,
	dashboardWorkingDirectory?: string,
	bashExecutablePath?: string,
	options?: {
		skipConfirmation?: boolean;
		tabColor?: string;
	}
): boolean => {
	if (isUnsafeScriptArgument(issueId)) {
		new Notice('Invalid issue ID -- contains forbidden characters.');
		return false;
	}

	if (scriptPathResolver === undefined) {
		new Notice('Worktree scripts not available -- plugin path could not be resolved.');
		return false;
	}

	const removeScriptPath = scriptPathResolver.resolvePluginScriptPath('remove-worktree.sh');

	const scriptArgs = [issueId];
	if (options?.skipConfirmation === true) {
		scriptArgs.push('--skip-confirmation');
	}

	return runScriptWithBash(
		removeScriptPath,
		scriptArgs,
		'Could not run remove-worktree script',
		dashboardWorkingDirectory,
		bashExecutablePath,
		options?.tabColor
	);
};

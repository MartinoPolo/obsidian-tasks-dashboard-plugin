import { Notice } from 'obsidian';

import type { ChildProcessApi, SpawnApi, SpawnSyncResult } from './platform-types';
import { getRequiredFunction, isObjectRecord, loadModule, toChildProcessApi } from './node-interop';

export const getSpawn = (): SpawnApi => {
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

export const runSpawnSync = (
	folderPath: string,
	args: string[],
	options?: { encoding?: string }
): SpawnSyncResult => {
	try {
		const childProcessModule = loadModule('child_process');
		const spawnSyncFunction = getRequiredFunction(childProcessModule, 'spawnSync');
		const spawnResult = spawnSyncFunction('git', args, {
			shell: false,
			cwd: folderPath,
			windowsHide: true,
			...options
		});
		if (!isObjectRecord(spawnResult)) {
			return { status: undefined, stdout: undefined };
		}

		const statusCandidate = spawnResult.status;
		const status = typeof statusCandidate === 'number' ? statusCandidate : undefined;
		const stdoutCandidate = spawnResult.stdout;
		const stdout = typeof stdoutCandidate === 'string' ? stdoutCandidate : undefined;
		return { status, stdout };
	} catch {
		return { status: undefined, stdout: undefined };
	}
};

export const runGitCommandStatus = (folderPath: string, args: string[]): number | undefined => {
	return runSpawnSync(folderPath, args).status;
};

export const runGitCommandOutput = (folderPath: string, args: string[]): string | undefined => {
	const result = runSpawnSync(folderPath, args, { encoding: 'utf8' });
	if (result.status !== 0) {
		return undefined;
	}
	return result.stdout;
};

export const notifyOnSpawnError = (childProcess: ChildProcessApi, message: string): void => {
	childProcess.on('error', () => {
		new Notice(message);
	});
};

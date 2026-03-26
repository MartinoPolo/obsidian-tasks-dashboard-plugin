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

export interface AsyncGitCommandResult {
	status: number;
	stdout: string;
	stderr: string;
}

export const runGitCommandAsync = (
	folderPath: string,
	args: string[]
): Promise<AsyncGitCommandResult> => {
	return new Promise((resolve, reject) => {
		const childProcessModule = loadModule('child_process');
		const spawnFunction = getRequiredFunction(childProcessModule, 'spawn');
		const spawnedProcess = spawnFunction('git', args, {
			shell: false,
			cwd: folderPath,
			windowsHide: true
		});

		if (!isObjectRecord(spawnedProcess)) {
			reject(new Error('Failed to spawn git process'));
			return;
		}

		let stdoutData = '';
		let stderrData = '';

		const stdoutStream = spawnedProcess.stdout;
		const stderrStream = spawnedProcess.stderr;

		if (isObjectRecord(stdoutStream) && typeof stdoutStream.on === 'function') {
			(stdoutStream.on as (event: string, listener: (chunk: unknown) => void) => void)(
				'data',
				(chunk: unknown) => {
					stdoutData += String(chunk);
				}
			);
		}

		if (isObjectRecord(stderrStream) && typeof stderrStream.on === 'function') {
			(stderrStream.on as (event: string, listener: (chunk: unknown) => void) => void)(
				'data',
				(chunk: unknown) => {
					stderrData += String(chunk);
				}
			);
		}

		const processOn = spawnedProcess.on;
		if (typeof processOn !== 'function') {
			reject(new Error('Spawned process missing event handler'));
			return;
		}

		(processOn as (event: string, listener: (...args: unknown[]) => void) => void).call(
			spawnedProcess,
			'close',
			(exitCode: unknown) => {
				const status = typeof exitCode === 'number' ? exitCode : 1;
				resolve({ status, stdout: stdoutData, stderr: stderrData });
			}
		);

		(processOn as (event: string, listener: (...args: unknown[]) => void) => void).call(
			spawnedProcess,
			'error',
			(error: unknown) => {
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		);
	});
};

export const notifyOnSpawnError = (childProcess: ChildProcessApi, message: string): void => {
	childProcess.on('error', () => {
		new Notice(message);
	});
};

import type { ChildProcessApi, ShellApi } from './platform-types';

export const isObjectRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === 'object' && value !== null;
};

export const loadModule = (moduleName: string): unknown => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const loadedModule: unknown = require(moduleName);
	return loadedModule;
};

export const getRequiredFunction = (
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

export const isPromiseString = (value: unknown): value is Promise<string> => {
	if (!isObjectRecord(value)) {
		return false;
	}

	return typeof value.then === 'function';
};

export const getShell = (): ShellApi => {
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

export const toChildProcessApi = (processCandidate: unknown): ChildProcessApi => {
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

export const pathExists = (targetPath: string): boolean => {
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

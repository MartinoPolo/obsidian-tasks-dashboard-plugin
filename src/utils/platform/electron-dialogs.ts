import { Notice } from 'obsidian';

import type { FileDialogFilter, FileDialogResult, RemoteDialogApi } from './platform-types';
import { getRequiredFunction, isObjectRecord, loadModule } from './node-interop';

const isFileDialogResult = (value: unknown): value is FileDialogResult => {
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
			filters?: FileDialogFilter[];
		}): Promise<FileDialogResult> => {
			const dialogResult = await showOpenDialogFunction(options);
			if (!isFileDialogResult(dialogResult)) {
				throw new Error('Invalid file dialog result');
			}

			return dialogResult;
		}
	};
};

export const pickFolder = async (defaultPath?: string): Promise<string | undefined> => {
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

export const pickFile = async (
	filters?: FileDialogFilter[],
	defaultPath?: string
): Promise<string | undefined> => {
	try {
		const remoteDialog = getRemoteDialog();
		const result = await remoteDialog.showOpenDialog({
			properties: ['openFile'],
			defaultPath,
			filters
		});
		if (result.canceled || result.filePaths.length === 0) {
			return undefined;
		}
		return result.filePaths[0];
	} catch {
		new Notice('Could not open file picker');
		return undefined;
	}
};

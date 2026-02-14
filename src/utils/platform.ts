import { Platform } from 'obsidian';

export interface PlatformService {
	openInFileExplorer: (folderPath: string) => void;
	openTerminal: (folderPath: string) => void;
	pickFolder: (defaultPath?: string) => Promise<string | undefined>;
}

export function createPlatformService(): PlatformService {
	const openInFileExplorer = (folderPath: string): void => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
		const { shell } = require('electron');
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
		void shell.openPath(folderPath);
	};

	const openTerminal = (folderPath: string): void => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
		const { exec } = require('child_process');

		if (Platform.isWin) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			exec(`start powershell -NoExit -Command "Set-Location '${folderPath.replace(/'/g, "''")}'"`, { cwd: folderPath });
		} else if (Platform.isMacOS) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			exec(`open -a Terminal "${folderPath}"`);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			exec(`x-terminal-emulator --working-directory="${folderPath}" 2>/dev/null || xterm -e "cd '${folderPath}' && $SHELL" &`);
		}
	};

	const pickFolder = async (defaultPath?: string): Promise<string | undefined> => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
		const { dialog } = require('electron').remote;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
		const result = await dialog.showOpenDialog({
			properties: ['openDirectory'],
			defaultPath
		});
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		if (result.canceled || result.filePaths.length === 0) {
			return undefined;
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		return result.filePaths[0] as string;
	};

	return { openInFileExplorer, openTerminal, pickFolder };
}

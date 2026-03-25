import { App, MarkdownView, TFile } from 'obsidian';

export async function openFileAndFocusEnd(app: App, filePath: string): Promise<void> {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (file instanceof TFile) {
		const leaf = app.workspace.getLeaf();
		await leaf.openFile(file);
		window.setTimeout(() => {
			const view = app.workspace.getActiveViewOfType(MarkdownView);
			if (view?.editor) {
				const editor = view.editor;
				const lastLine = editor.lastLine();
				const tasksHeadingLine = findTasksHeadingLine(editor, lastLine);

				if (tasksHeadingLine === undefined) {
					const lastLineLength = editor.getLine(lastLine).length;
					editor.setCursor({ line: lastLine, ch: lastLineLength });
					editor.focus();
					return;
				}

				const targetLine = getTasksSectionTargetLine(editor, tasksHeadingLine, lastLine);
				const targetLineLength = editor.getLine(targetLine).length;
				editor.setCursor({ line: targetLine, ch: targetLineLength });
				editor.focus();
			}
		}, 100);
	}
}

function findTasksHeadingLine(
	editor: MarkdownView['editor'],
	lastLine: number
): number | undefined {
	for (let lineIndex = 0; lineIndex <= lastLine; lineIndex += 1) {
		const line = editor.getLine(lineIndex).trim();
		if (line.toLowerCase() === '## tasks') {
			return lineIndex;
		}
	}

	return undefined;
}

function getTasksSectionTargetLine(
	editor: MarkdownView['editor'],
	tasksHeadingLine: number,
	lastLine: number
): number {
	let sectionEndLine = lastLine;

	for (let lineIndex = tasksHeadingLine + 1; lineIndex <= lastLine; lineIndex += 1) {
		const line = editor.getLine(lineIndex).trim();
		if (line.startsWith('## ')) {
			sectionEndLine = lineIndex - 1;
			break;
		}
	}

	while (sectionEndLine > tasksHeadingLine && editor.getLine(sectionEndLine).trim() === '') {
		sectionEndLine -= 1;
	}

	if (sectionEndLine <= tasksHeadingLine) {
		const candidateLine = tasksHeadingLine + 1;
		return candidateLine <= lastLine ? candidateLine : tasksHeadingLine;
	}

	return sectionEndLine;
}

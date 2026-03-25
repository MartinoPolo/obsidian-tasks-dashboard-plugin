import { App, TFile } from 'obsidian';
import type { DashboardConfig } from '../types';
import { escapeForRegExp } from './issue-manager-shared';

const CONTROLS_BLOCK_FENCE_START = '```tasks-dashboard-controls';

export type EditDashboardIssueBlockFn = (
	dashboard: DashboardConfig,
	issueId: string,
	transformBlock: (block: string) => string
) => Promise<void>;

export type UpsertDashboardIssueBlockFieldFn = (
	block: string,
	fieldName: string,
	fieldValue: string
) => string;

export function createEditDashboardIssueBlock(
	app: App,
	getDashboardFile: (dashboard: DashboardConfig) => TFile | undefined
): EditDashboardIssueBlockFn {
	return async (
		dashboard: DashboardConfig,
		issueId: string,
		transformBlock: (block: string) => string
	): Promise<void> => {
		const dashboardFile = getDashboardFile(dashboard);
		if (dashboardFile === undefined) {
			return;
		}

		let dashboardContent = await app.vault.read(dashboardFile);
		const startMarker = `%% ISSUE:${issueId}:START %%`;
		const endMarker = `%% ISSUE:${issueId}:END %%`;
		const startIndex = dashboardContent.indexOf(startMarker);
		const endIndex = dashboardContent.indexOf(endMarker);

		if (startIndex === -1 || endIndex === -1) {
			return;
		}

		const blockEnd = endIndex + endMarker.length;
		const originalBlock = dashboardContent.substring(startIndex, blockEnd);
		const updatedBlock = transformBlock(originalBlock);

		if (updatedBlock === originalBlock) {
			return;
		}

		dashboardContent =
			dashboardContent.slice(0, startIndex) + updatedBlock + dashboardContent.slice(blockEnd);
		await app.vault.modify(dashboardFile, dashboardContent);
	};
}

export const upsertDashboardIssueBlockField: UpsertDashboardIssueBlockFieldFn = (
	block: string,
	fieldName: string,
	fieldValue: string
): string => {
	const controlsStart = block.indexOf(CONTROLS_BLOCK_FENCE_START);
	if (controlsStart === -1) {
		return block;
	}
	const firstFenceEnd = block.indexOf('```', controlsStart + CONTROLS_BLOCK_FENCE_START.length);
	if (firstFenceEnd === -1) {
		return block;
	}

	const sanitizedFieldValue = fieldValue.replace(/[\r\n]/g, ' ');
	const controlsSection = block.slice(controlsStart, firstFenceEnd);
	const escapedFieldName = escapeForRegExp(fieldName);
	const fieldRegex = new RegExp(`^${escapedFieldName}:\\s*.*$`, 'm');
	const updatedControlsSection = fieldRegex.test(controlsSection)
		? controlsSection.replace(fieldRegex, `${fieldName}: ${sanitizedFieldValue}`)
		: `${controlsSection}${fieldName}: ${sanitizedFieldValue}\n`;

	return block.slice(0, controlsStart) + updatedControlsSection + block.slice(firstFenceEnd);
};

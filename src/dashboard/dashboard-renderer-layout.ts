import TasksDashboardPlugin from '../../main';
import {
	type DashboardConfig,
	type DashboardIssueActionLayout,
	type IssueActionKey
} from '../types';
import {
	DEFAULT_ROW1_ACTIONS,
	ISSUE_ACTION_ORDER
} from './dashboard-renderer-constants';
import { RuntimeIssueActionLayout } from './dashboard-renderer-types';

const getDefaultRow2Actions = (): IssueActionKey[] => {
	return ISSUE_ACTION_ORDER.filter((key) => !DEFAULT_ROW1_ACTIONS.includes(key));
};

const isIssueActionKey = (value: string): value is IssueActionKey => {
	return (ISSUE_ACTION_ORDER as readonly string[]).includes(value);
};

export const dedupeIssueActionKeys = (keys: IssueActionKey[]): IssueActionKey[] => {
	const deduped: IssueActionKey[] = [];
	for (const key of keys) {
		if (!deduped.includes(key)) {
			deduped.push(key);
		}
	}
	return deduped;
};

const sanitizeLayoutKeys = (value: unknown): IssueActionKey[] => {
	if (!Array.isArray(value)) {
		return [];
	}

	const sanitized: IssueActionKey[] = [];
	for (const item of value) {
		if (typeof item !== 'string' || !isIssueActionKey(item)) {
			continue;
		}
		sanitized.push(item);
	}

	return dedupeIssueActionKeys(sanitized);
};

export const getIssueActionLayout = (dashboard: DashboardConfig): RuntimeIssueActionLayout => {
	const rawLayout = dashboard.issueActionLayout;
	const row1 = sanitizeLayoutKeys(rawLayout?.row1);
	const row2 = sanitizeLayoutKeys(rawLayout?.row2);
	const hidden = sanitizeLayoutKeys(rawLayout?.hidden);

	const normalizedRow1 = row1.length > 0 ? row1 : [...DEFAULT_ROW1_ACTIONS];
	const normalizedRow2 = row2.length > 0 ? row2 : getDefaultRow2Actions();

	const usedKeys = new Set<IssueActionKey>();
	const uniqueRow1: IssueActionKey[] = [];
	for (const key of normalizedRow1) {
		if (usedKeys.has(key)) {
			continue;
		}
		usedKeys.add(key);
		uniqueRow1.push(key);
	}

	const uniqueRow2: IssueActionKey[] = [];
	for (const key of normalizedRow2) {
		if (usedKeys.has(key)) {
			continue;
		}
		usedKeys.add(key);
		uniqueRow2.push(key);
	}

	for (const key of ISSUE_ACTION_ORDER) {
		if (usedKeys.has(key)) {
			continue;
		}
		uniqueRow2.push(key);
		usedKeys.add(key);
	}

	const hiddenSet = new Set(hidden);

	return {
		row1: uniqueRow1,
		row2: uniqueRow2,
		hidden: ISSUE_ACTION_ORDER.filter((key) => hiddenSet.has(key))
	};
};

export const saveIssueActionLayout = (
	plugin: TasksDashboardPlugin,
	dashboard: DashboardConfig,
	layout: RuntimeIssueActionLayout,
	options?: { triggerRefresh?: boolean }
): void => {
	const shouldTriggerRefresh = options?.triggerRefresh ?? true;
	const nextLayout: DashboardIssueActionLayout = {
		row1: dedupeIssueActionKeys(layout.row1),
		row2: dedupeIssueActionKeys(layout.row2),
		hidden: dedupeIssueActionKeys(layout.hidden)
	};
	dashboard.issueActionLayout = nextLayout;
	void plugin.saveSettings().then(() => {
		if (shouldTriggerRefresh) {
			plugin.triggerDashboardRefresh();
		}
	});
};

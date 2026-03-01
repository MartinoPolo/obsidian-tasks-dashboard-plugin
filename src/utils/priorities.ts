import type { Priority } from '../types';

const PRIORITY_CLASS_PREFIX = 'tdc-priority-';

export const PRIORITY_ORDER: Readonly<Record<Priority, number>> = {
	top: 0,
	high: 1,
	medium: 2,
	low: 3
};

const getPriorityRank = (priority: Priority): number => {
	return PRIORITY_ORDER[priority];
};

export function comparePriorities(a: Priority, b: Priority): number {
	return getPriorityRank(a) - getPriorityRank(b);
}

export function getPriorityClass(priority: Priority): string {
	return `${PRIORITY_CLASS_PREFIX}${priority}`;
}

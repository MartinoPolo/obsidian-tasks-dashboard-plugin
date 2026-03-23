import type { Priority } from '../types';

const PRIORITY_CLASS_PREFIX = 'tdc-priority-';

export const PRIORITY_ORDER: Readonly<Record<Priority, number>> = {
	top: 0,
	high: 1,
	medium: 2,
	low: 3
};

export function getPriorityClass(priority: Priority): string {
	return `${PRIORITY_CLASS_PREFIX}${priority}`;
}

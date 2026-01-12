import { Priority, PRIORITY_ORDER } from '../types';
export function comparePriorities(a: Priority, b: Priority): number {
	return PRIORITY_ORDER[a] - PRIORITY_ORDER[b];
}
export function getPriorityClass(priority: Priority): string {
	return `tdc-priority-${priority}`;
}

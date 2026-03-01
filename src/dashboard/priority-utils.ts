import type { Priority } from '../types';

const VALID_PRIORITIES: readonly Priority[] = ['low', 'medium', 'high', 'top'];

export function isPriority(value: string): value is Priority {
	return VALID_PRIORITIES.includes(value as Priority);
}

export function parsePriority(value: string | undefined, fallback: Priority = 'medium'): Priority {
	if (value === undefined) {
		return fallback;
	}

	return isPriority(value) ? value : fallback;
}

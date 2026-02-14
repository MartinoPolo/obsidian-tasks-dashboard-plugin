const MAX_SLUG_LENGTH = 50;

export function slugify(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.substring(0, MAX_SLUG_LENGTH);
}
export function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
}

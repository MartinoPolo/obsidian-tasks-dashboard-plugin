export function slugify(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.substring(0, 50);
}
export function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

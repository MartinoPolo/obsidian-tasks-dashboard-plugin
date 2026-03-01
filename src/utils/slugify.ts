const MAX_SLUG_LENGTH = 50;
const NON_WORD_OR_SEPARATOR_PATTERN = /[^\w\s-]/g;
const MULTIPLE_WHITESPACE_PATTERN = /\s+/g;
const MULTIPLE_DASH_PATTERN = /-+/g;
const BASE_36_RADIX = 36;
const RANDOM_SEGMENT_START = 2;
const RANDOM_SEGMENT_END = 11;

const truncateSlug = (slug: string): string => {
	return slug.substring(0, MAX_SLUG_LENGTH);
};

const normalizeSlugText = (name: string): string => {
	return name
		.toLowerCase()
		.trim()
		.replace(NON_WORD_OR_SEPARATOR_PATTERN, '')
		.replace(MULTIPLE_WHITESPACE_PATTERN, '-')
		.replace(MULTIPLE_DASH_PATTERN, '-');
};

export function slugify(name: string): string {
	return truncateSlug(normalizeSlugText(name));
}

export function generateId(): string {
	const timePart = Date.now().toString(BASE_36_RADIX);
	const randomPart = Math.random()
		.toString(BASE_36_RADIX)
		.substring(RANDOM_SEGMENT_START, RANDOM_SEGMENT_END);

	return timePart + randomPart;
}

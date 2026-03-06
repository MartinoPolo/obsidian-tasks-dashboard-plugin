export function extractLastPathSegment(folderPath: string): string {
	const normalizedPath = folderPath.replace(/[\\/]+$/, '');
	const lastSeparatorIndex = Math.max(
		normalizedPath.lastIndexOf('/'),
		normalizedPath.lastIndexOf('\\')
	);
	if (lastSeparatorIndex === -1) {
		return normalizedPath;
	}
	return normalizedPath.slice(lastSeparatorIndex + 1);
}

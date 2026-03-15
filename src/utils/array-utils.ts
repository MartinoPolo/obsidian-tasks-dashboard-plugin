export function getWrappedIndex(current: number, step: number, length: number): number {
	if (length === 0) {
		return 0;
	}
	const safe = current >= 0 ? current : 0;
	return (((safe + step) % length) + length) % length;
}

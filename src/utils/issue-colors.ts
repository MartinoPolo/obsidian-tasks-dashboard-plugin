import {
	DEFAULT_ISSUE_COLOR,
	getContrastingForegroundColor,
	getIsDarkTheme,
	sanitizeHexColor,
	type IssueColorEntry
} from './color';

const ISSUE_COLOR_PALETTE_FOR_DARK_THEME: readonly IssueColorEntry[] = [
	// Row 1 – very dark saturated (white text)
	{ background: '#5a1a1a', foreground: '#ffffff' },
	{ background: '#1a2e5a', foreground: '#ffffff' },
	{ background: '#1a4a2e', foreground: '#ffffff' },
	{ background: '#5a4400', foreground: '#ffffff' },
	{ background: '#3a1a5a', foreground: '#ffffff' },
	{ background: '#5a2200', foreground: '#ffffff' },

	// Row 2 – dark saturated (white text)
	{ background: '#7a1f1f', foreground: '#ffffff' },
	{ background: '#1e3f8a', foreground: '#ffffff' },
	{ background: '#1b5e3a', foreground: '#ffffff' },
	{ background: '#7a5c00', foreground: '#ffffff' },
	{ background: '#4b2a7a', foreground: '#ffffff' },
	{ background: '#7a2f00', foreground: '#ffffff' },

	// Row 3 – medium/vivid (white text)
	{ background: '#e25555', foreground: '#ffffff' },
	{ background: '#4f8df7', foreground: '#ffffff' },
	{ background: '#3fbf7f', foreground: '#ffffff' },
	{ background: '#e6b422', foreground: '#000000' },
	{ background: '#9b6ef3', foreground: '#ffffff' },
	{ background: '#ff7a45', foreground: '#000000' },

	// Row 4 – light/pastel (black text)
	{ background: '#ffb3b3', foreground: '#000000' },
	{ background: '#bcd6ff', foreground: '#000000' },
	{ background: '#b8f0d2', foreground: '#000000' },
	{ background: '#fff1a6', foreground: '#000000' },
	{ background: '#e0ccff', foreground: '#000000' },
	{ background: '#ffd1b8', foreground: '#000000' },

	// Row 5 – neutrals (black to white)
	{ background: '#000000', foreground: '#ffffff' },
	{ background: '#2b2b2b', foreground: '#ffffff' },
	{ background: '#555555', foreground: '#ffffff' },
	{ background: '#999999', foreground: '#000000' },
	{ background: '#cccccc', foreground: '#000000' },
	{ background: '#ffffff', foreground: '#000000' }
] as const;

const ISSUE_COLOR_PALETTE_FOR_LIGHT_THEME: readonly IssueColorEntry[] = [
	// Row 1 – very light pastels (black text)
	{ background: '#ffd6d6', foreground: '#000000' },
	{ background: '#d6e6ff', foreground: '#000000' },
	{ background: '#d6f5e6', foreground: '#000000' },
	{ background: '#fff7cc', foreground: '#000000' },
	{ background: '#eee4ff', foreground: '#000000' },
	{ background: '#ffe2d1', foreground: '#000000' },

	// Row 2 – light tints (black text)
	{ background: '#f8a0a0', foreground: '#000000' },
	{ background: '#a0c4ff', foreground: '#000000' },
	{ background: '#a0e8c0', foreground: '#000000' },
	{ background: '#ffe680', foreground: '#000000' },
	{ background: '#d0b8ff', foreground: '#000000' },
	{ background: '#ffb899', foreground: '#000000' },

	// Row 3 – medium/vivid (white or black text)
	{ background: '#f26666', foreground: '#ffffff' },
	{ background: '#5c9cff', foreground: '#ffffff' },
	{ background: '#4fd18f', foreground: '#000000' },
	{ background: '#f2c94c', foreground: '#000000' },
	{ background: '#a47cf7', foreground: '#ffffff' },
	{ background: '#ff8c5a', foreground: '#000000' },

	// Row 4 – dark saturated (white text)
	{ background: '#8a2a2a', foreground: '#ffffff' },
	{ background: '#2a4fb0', foreground: '#ffffff' },
	{ background: '#1f7a4f', foreground: '#ffffff' },
	{ background: '#9a7400', foreground: '#ffffff' },
	{ background: '#5e3bb0', foreground: '#ffffff' },
	{ background: '#8a3a12', foreground: '#ffffff' },

	// Row 5 – neutrals (white to black)
	{ background: '#ffffff', foreground: '#000000' },
	{ background: '#cccccc', foreground: '#000000' },
	{ background: '#999999', foreground: '#000000' },
	{ background: '#555555', foreground: '#ffffff' },
	{ background: '#2b2b2b', foreground: '#ffffff' },
	{ background: '#000000', foreground: '#ffffff' }
] as const;

const ISSUE_COLOR_FALLBACK = DEFAULT_ISSUE_COLOR;

export const ISSUE_COLOR_PICKER_COLUMNS = 6;

const normalizeIssueColor = (color: string): string => {
	return sanitizeHexColor(color, ISSUE_COLOR_FALLBACK);
};

export const getThemeAwareIssueColorPalette = (): readonly IssueColorEntry[] => {
	return getIsDarkTheme() ? ISSUE_COLOR_PALETTE_FOR_DARK_THEME : ISSUE_COLOR_PALETTE_FOR_LIGHT_THEME;
};

export const getForegroundForIssueColor = (backgroundHex: string): string => {
	const normalized = normalizeIssueColor(backgroundHex);
	const palette = getThemeAwareIssueColorPalette();
	for (const entry of palette) {
		if (entry.background === normalized) {
			return entry.foreground;
		}
	}
	return getContrastingForegroundColor(normalized);
};

export const collectUsedIssueColors = (issueColors: Record<string, string>): Set<string> => {
	const usedColors = new Set<string>();
	for (const color of Object.values(issueColors)) {
		usedColors.add(normalizeIssueColor(color));
	}
	return usedColors;
};

export const isIssueColorUsed = (
	issueColors: Record<string, string>,
	color: string,
	issueIdToIgnore?: string
): boolean => {
	const normalizedColor = normalizeIssueColor(color);
	for (const [issueId, issueColor] of Object.entries(issueColors)) {
		if (issueIdToIgnore !== undefined && issueId === issueIdToIgnore) {
			continue;
		}
		if (normalizeIssueColor(issueColor) === normalizedColor) {
			return true;
		}
	}
	return false;
};

export const getNextAvailableIssueColor = (issueColors: Record<string, string>): string => {
	const usedColors = collectUsedIssueColors(issueColors);
	for (const entry of getThemeAwareIssueColorPalette()) {
		const normalizedColor = normalizeIssueColor(entry.background);
		if (!usedColors.has(normalizedColor)) {
			return normalizedColor;
		}
	}
	return normalizeIssueColor(getThemeAwareIssueColorPalette()[0].background);
};

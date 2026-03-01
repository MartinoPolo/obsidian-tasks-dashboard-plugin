const HEX_COLOR_PATTERN = /^#([0-9a-f]{6})$/i;

interface RgbColor {
	r: number;
	g: number;
	b: number;
}

export interface DerivedIssueSurfaceColors {
	headerBackground: string;
	controlsBackground: string;
	checklistBackground: string;
	controlsBorder: string;
	checklistBorder: string;
}

const clampChannel = (value: number): number => {
	if (value < 0) {
		return 0;
	}
	if (value > 255) {
		return 255;
	}
	return Math.round(value);
};

const normalizeHex = (color: string, fallback: string): string => {
	const trimmed = color.trim();
	if (!HEX_COLOR_PATTERN.test(trimmed)) {
		return fallback;
	}
	return trimmed.toLowerCase();
};

const hexToRgb = (hex: string): RgbColor => {
	const normalized = normalizeHex(hex, '#4a8cc7');
	return {
		r: parseInt(normalized.substring(1, 3), 16),
		g: parseInt(normalized.substring(3, 5), 16),
		b: parseInt(normalized.substring(5, 7), 16)
	};
};

const rgbToHex = (color: RgbColor): string => {
	const toHex = (value: number): string => clampChannel(value).toString(16).padStart(2, '0');
	return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
};

const mixRgb = (base: RgbColor, target: RgbColor, targetWeight: number): RgbColor => {
	const normalizedTargetWeight = Math.max(0, Math.min(1, targetWeight));
	const baseWeight = 1 - normalizedTargetWeight;
	return {
		r: base.r * baseWeight + target.r * normalizedTargetWeight,
		g: base.g * baseWeight + target.g * normalizedTargetWeight,
		b: base.b * baseWeight + target.b * normalizedTargetWeight
	};
};

const mixHex = (baseHex: string, targetHex: string, targetWeight: number): string => {
	const base = hexToRgb(baseHex);
	const target = hexToRgb(targetHex);
	return rgbToHex(mixRgb(base, target, targetWeight));
};

export const getIsDarkTheme = (): boolean => document.body.classList.contains('theme-dark');

export const sanitizeHexColor = (color: string, fallback: string): string =>
	normalizeHex(color, fallback);

export const deriveIssueSurfaceColors = (
	mainColor: string,
	isDarkTheme: boolean
): DerivedIssueSurfaceColors => {
	const normalizedMainColor = normalizeHex(mainColor, '#4a8cc7');

	if (isDarkTheme) {
		return {
			headerBackground: normalizedMainColor,
			controlsBackground: mixHex(normalizedMainColor, '#000000', 0.78),
			checklistBackground: mixHex(normalizedMainColor, '#000000', 0.86),
			controlsBorder: mixHex(normalizedMainColor, '#000000', 0.58),
			checklistBorder: mixHex(normalizedMainColor, '#000000', 0.48)
		};
	}

	return {
		headerBackground: normalizedMainColor,
		controlsBackground: mixHex(normalizedMainColor, '#ffffff', 0.74),
		checklistBackground: mixHex(normalizedMainColor, '#ffffff', 0.84),
		controlsBorder: mixHex(normalizedMainColor, '#ffffff', 0.5),
		checklistBorder: mixHex(normalizedMainColor, '#ffffff', 0.45)
	};
};
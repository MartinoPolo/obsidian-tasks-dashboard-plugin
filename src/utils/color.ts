const HEX_COLOR_PATTERN = /^#([0-9a-f]{6})$/i;
const DEFAULT_MAIN_COLOR = '#4a8cc7';
export const BLACK_HEX = '#000000';
export const WHITE_HEX = '#ffffff';

type ThemeVariant = 'dark' | 'light';

interface RgbColor {
	r: number;
	g: number;
	b: number;
}

interface ThemeMixConfig {
	targetHex: string;
	controlsBackgroundWeight: number;
	checklistBackgroundWeight: number;
	controlsBorderWeight: number;
	checklistBorderWeight: number;
}

export interface DerivedIssueSurfaceColors {
	headerBackground: string;
	controlsBackground: string;
	checklistBackground: string;
	controlsBorder: string;
	checklistBorder: string;
}

const clampChannel = (value: number): number => {
	if (value <= 0) {
		return 0;
	}
	if (value >= 255) {
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
	const normalized = normalizeHex(hex, DEFAULT_MAIN_COLOR);
	return {
		r: parseInt(normalized.slice(1, 3), 16),
		g: parseInt(normalized.slice(3, 5), 16),
		b: parseInt(normalized.slice(5, 7), 16)
	};
};

const rgbToHex = (color: RgbColor): string => {
	const toHex = (value: number): string => clampChannel(value).toString(16).padStart(2, '0');
	return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
};

const mixRgb = (base: RgbColor, target: RgbColor, targetWeight: number): RgbColor => {
	const normalizedTargetWeight = Math.max(0, Math.min(1, targetWeight));
	const mixChannel = (baseChannel: number, targetChannel: number): number =>
		baseChannel + (targetChannel - baseChannel) * normalizedTargetWeight;
	return {
		r: mixChannel(base.r, target.r),
		g: mixChannel(base.g, target.g),
		b: mixChannel(base.b, target.b)
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

const THEME_MIX_CONFIG: Record<ThemeVariant, ThemeMixConfig> = {
	dark: {
		targetHex: BLACK_HEX,
		controlsBackgroundWeight: 0.78,
		checklistBackgroundWeight: 0.86,
		controlsBorderWeight: 0.58,
		checklistBorderWeight: 0.48
	},
	light: {
		targetHex: WHITE_HEX,
		controlsBackgroundWeight: 0.74,
		checklistBackgroundWeight: 0.84,
		controlsBorderWeight: 0.5,
		checklistBorderWeight: 0.45
	}
};

export const deriveIssueSurfaceColors = (
	mainColor: string,
	isDarkTheme: boolean
): DerivedIssueSurfaceColors => {
	const normalizedMainColor = normalizeHex(mainColor, DEFAULT_MAIN_COLOR);
	const themeVariant: ThemeVariant = isDarkTheme ? 'dark' : 'light';
	const mixConfig = THEME_MIX_CONFIG[themeVariant];

	return {
		headerBackground: normalizedMainColor,
		controlsBackground: mixHex(
			normalizedMainColor,
			mixConfig.targetHex,
			mixConfig.controlsBackgroundWeight
		),
		checklistBackground: mixHex(
			normalizedMainColor,
			mixConfig.targetHex,
			mixConfig.checklistBackgroundWeight
		),
		controlsBorder: mixHex(
			normalizedMainColor,
			mixConfig.targetHex,
			mixConfig.controlsBorderWeight
		),
		checklistBorder: mixHex(
			normalizedMainColor,
			mixConfig.targetHex,
			mixConfig.checklistBorderWeight
		)
	};
};

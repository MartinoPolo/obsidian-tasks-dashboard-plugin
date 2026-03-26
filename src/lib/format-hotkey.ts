import type { App, Hotkey } from 'obsidian';
import { Platform } from 'obsidian';

interface HotkeyManager {
	getHotkeys(commandId: string): Hotkey[] | undefined;
	getDefaultHotkeys(commandId: string): Hotkey[] | undefined;
}

function getHotkeyManager(app: App): HotkeyManager | undefined {
	const manager: unknown = Reflect.get(app, 'hotkeyManager');
	if (manager === undefined || manager === null || typeof manager !== 'object') {
		return undefined;
	}
	const candidate = manager as Record<string, unknown>;
	if (
		typeof candidate.getHotkeys !== 'function' ||
		typeof candidate.getDefaultHotkeys !== 'function'
	) {
		return undefined;
	}
	return manager as HotkeyManager;
}

export function getHotkeyForCommand(app: App, commandId: string): Hotkey | undefined {
	const manager = getHotkeyManager(app);
	if (manager === undefined) {
		return undefined;
	}
	const customHotkeys = manager.getHotkeys(commandId);
	if (customHotkeys !== undefined && customHotkeys.length > 0) {
		return customHotkeys[0];
	}
	const defaultHotkeys = manager.getDefaultHotkeys(commandId);
	if (defaultHotkeys !== undefined && defaultHotkeys.length > 0) {
		return defaultHotkeys[0];
	}
	return undefined;
}

function formatModifier(modifier: string): string {
	if (modifier === 'Mod') {
		return Platform.isMacOS ? 'Cmd' : 'Ctrl';
	}
	if (modifier === 'Meta') {
		return Platform.isMacOS ? 'Cmd' : 'Win';
	}
	return modifier;
}

export function formatHotkeyLabel(hotkey: Hotkey): string {
	const parts = hotkey.modifiers.map(formatModifier);
	const key = hotkey.key.length === 1 ? hotkey.key.toUpperCase() : hotkey.key;
	parts.push(key);
	return parts.join('+');
}

export function buildTooltipWithHotkey(label: string, app: App, commandId: string): string {
	const hotkey = getHotkeyForCommand(app, commandId);
	if (hotkey === undefined) {
		return label;
	}
	return `${label} (${formatHotkeyLabel(hotkey)})`;
}

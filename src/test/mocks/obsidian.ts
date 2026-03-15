import { vi } from 'vitest';

export class Modal {
	app: unknown;
	contentEl: HTMLElement;
	containerEl: HTMLElement;
	modalEl: HTMLElement;

	constructor(app: unknown) {
		this.app = app;
		this.contentEl = document.createElement('div');
		this.containerEl = document.createElement('div');
		this.modalEl = document.createElement('div');
	}

	open(): void {}
	close(): void {}
	onOpen(): void {}
	onClose(): void {}
}

export class MarkdownRenderChild {
	containerEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}

	load(): void {}
	unload(): void {}
	register(_cb: () => void): void {}
	registerEvent(_ref: unknown): void {}
}

export class Notice {
	constructor(_message: string, _duration?: number) {}
}

export class Setting {
	settingEl: HTMLElement;

	constructor(containerEl: HTMLElement) {
		this.settingEl = document.createElement('div');
		containerEl.appendChild(this.settingEl);
	}

	setName(_name: string): this {
		return this;
	}
	setDesc(_desc: string): this {
		return this;
	}
	addText(_cb: (text: unknown) => unknown): this {
		return this;
	}
	addToggle(_cb: (toggle: unknown) => unknown): this {
		return this;
	}
	addDropdown(_cb: (dropdown: unknown) => unknown): this {
		return this;
	}
	addButton(_cb: (button: unknown) => unknown): this {
		return this;
	}
	setClass(_cls: string): this {
		return this;
	}
}

export class Menu {
	addItem(_cb: (item: unknown) => unknown): this {
		return this;
	}
	showAtMouseEvent(_event: MouseEvent): void {}
	showAtPosition(_pos: { x: number; y: number }): void {}
}

export class TFile {
	path: string;
	basename: string;
	extension: string;
	name: string;

	constructor(path = 'test.md') {
		this.path = path;
		this.basename = path.replace(/\.[^/.]+$/, '');
		this.extension = 'md';
		this.name = path.split('/').pop() ?? path;
	}
}

export const Platform = {
	isDesktop: true,
	isMobile: false,
	isDesktopApp: true,
	isMacOS: false
};

export const setTooltip = vi.fn();

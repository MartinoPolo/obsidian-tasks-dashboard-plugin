import { calculatePanelPosition } from './position-panel';

interface AnchoredPanelOptions {
	anchorElement: HTMLElement;
	onclose: () => void;
	minPanelWidth?: number;
	closeOnBlur?: boolean;
	closeOnEscape?: boolean;
	outsideClickCapture?: boolean;
	useRequestAnimationFrame?: boolean;
	customPosition?: (
		panelElement: HTMLElement,
		anchorElement: HTMLElement
	) => Record<string, string>;
}

/**
 * Svelte 5 {@attach} directive that positions a fixed panel relative to an anchor element
 * and manages outside-click, escape, scroll/resize/blur lifecycle.
 */
export function attachAnchoredPanel(options: AnchoredPanelOptions) {
	return (panelElement: HTMLElement) => {
		const {
			anchorElement,
			onclose,
			minPanelWidth = 280,
			closeOnBlur = true,
			closeOnEscape = true,
			outsideClickCapture = true,
			useRequestAnimationFrame = true,
			customPosition
		} = options;

		document.body.appendChild(panelElement);

		const applyPosition = () => {
			if (!anchorElement.isConnected) {
				onclose();
				return;
			}

			if (customPosition !== undefined) {
				const styles = customPosition(panelElement, anchorElement);
				for (const [property, value] of Object.entries(styles)) {
					panelElement.style.setProperty(property, value);
				}
				return;
			}

			const position = calculatePanelPosition(panelElement, anchorElement, minPanelWidth);
			panelElement.style.top = `${position.top}px`;
			panelElement.style.left = `${position.left}px`;
			panelElement.style.maxHeight = `${position.maxHeight}px`;
		};

		const handleOutsideClick = (event: MouseEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) {
				onclose();
				return;
			}
			if (panelElement.contains(target)) {
				return;
			}
			if (anchorElement.contains(target)) {
				return;
			}
			onclose();
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key !== 'Escape') {
				return;
			}
			event.preventDefault();
			event.stopPropagation();
			onclose();
		};

		// RAF-based throttle to coalesce rapid scroll/resize events into a single layout pass
		let scheduledFrameId: number | undefined;
		const throttledApplyPosition = () => {
			if (scheduledFrameId !== undefined) {
				return;
			}
			scheduledFrameId = requestAnimationFrame(() => {
				scheduledFrameId = undefined;
				applyPosition();
			});
		};

		if (useRequestAnimationFrame) {
			requestAnimationFrame(applyPosition);
		} else {
			applyPosition();
		}

		window.addEventListener('scroll', throttledApplyPosition, true);
		window.addEventListener('resize', throttledApplyPosition);
		document.addEventListener('click', handleOutsideClick, outsideClickCapture);

		if (closeOnBlur) {
			window.addEventListener('blur', onclose);
		}
		if (closeOnEscape) {
			document.addEventListener('keydown', handleEscape, true);
		}

		return () => {
			if (scheduledFrameId !== undefined) {
				cancelAnimationFrame(scheduledFrameId);
			}
			panelElement.remove();
			window.removeEventListener('scroll', throttledApplyPosition, true);
			window.removeEventListener('resize', throttledApplyPosition);
			document.removeEventListener('click', handleOutsideClick, outsideClickCapture);

			if (closeOnBlur) {
				window.removeEventListener('blur', onclose);
			}
			if (closeOnEscape) {
				document.removeEventListener('keydown', handleEscape, true);
			}
		};
	};
}

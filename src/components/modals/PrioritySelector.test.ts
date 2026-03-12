import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import PrioritySelector from './PrioritySelector.svelte';

describe('PrioritySelector', () => {
	const defaultProps = {
		onselect: vi.fn(),
		oncancel: vi.fn(),
	};

	it('renders all four priority options', () => {
		render(PrioritySelector, { props: defaultProps });
		expect(screen.getByText('Low')).toBeInTheDocument();
		expect(screen.getByText('Medium')).toBeInTheDocument();
		expect(screen.getByText('High')).toBeInTheDocument();
		expect(screen.getByText('Top')).toBeInTheDocument();
	});

	it('renders title', () => {
		render(PrioritySelector, { props: defaultProps });
		expect(screen.getByText('Issue Priority')).toBeInTheDocument();
	});

	it('renders custom title', () => {
		render(PrioritySelector, {
			props: { ...defaultProps, title: 'Select Priority' },
		});
		expect(screen.getByText('Select Priority')).toBeInTheDocument();
	});

	it('selects initial priority', () => {
		render(PrioritySelector, {
			props: { ...defaultProps, initialPriority: 'high' },
		});
		const highButton = screen.getByText('High').closest('button');
		expect(highButton?.getAttribute('aria-pressed')).toBe('true');
	});

	it('defaults to low priority', () => {
		render(PrioritySelector, { props: defaultProps });
		const lowButton = screen.getByText('Low').closest('button');
		expect(lowButton?.getAttribute('aria-pressed')).toBe('true');
	});

	it('updates selection on click', async () => {
		render(PrioritySelector, { props: defaultProps });
		const mediumButton = screen.getByText('Medium').closest('button') as HTMLElement;
		await fireEvent.click(mediumButton);
		expect(mediumButton.getAttribute('aria-pressed')).toBe('true');
	});

	it('calls onselect with priority on confirm', async () => {
		const onselect = vi.fn();
		const { container } = render(PrioritySelector, {
			props: { ...defaultProps, onselect },
		});
		const confirmButton = container.querySelector('.tdc-prompt-btn-confirm') as HTMLElement;
		await fireEvent.click(confirmButton);
		expect(onselect).toHaveBeenCalledWith('low');
	});

	it('calls oncancel when cancel is clicked', async () => {
		const oncancel = vi.fn();
		render(PrioritySelector, {
			props: { ...defaultProps, oncancel },
		});
		await fireEvent.click(screen.getByText('Cancel', { exact: false }));
		expect(oncancel).toHaveBeenCalledOnce();
	});

	it('navigates with arrow keys', async () => {
		render(PrioritySelector, { props: defaultProps });

		// Press ArrowDown to move from Low to Medium
		await fireEvent.keyDown(window, { key: 'ArrowDown' });
		const mediumButton = screen.getByText('Medium').closest('button');
		expect(mediumButton?.getAttribute('aria-pressed')).toBe('true');

		// Press ArrowUp to move back to Low
		await fireEvent.keyDown(window, { key: 'ArrowUp' });
		const lowButton = screen.getByText('Low').closest('button');
		expect(lowButton?.getAttribute('aria-pressed')).toBe('true');
	});

	it('wraps around with arrow keys', async () => {
		render(PrioritySelector, {
			props: { ...defaultProps, initialPriority: 'top' },
		});

		// Press ArrowDown from Top wraps to Low
		await fireEvent.keyDown(window, { key: 'ArrowDown' });
		const lowButton = screen.getByText('Low').closest('button');
		expect(lowButton?.getAttribute('aria-pressed')).toBe('true');
	});

	it('confirms with Enter key', async () => {
		const onselect = vi.fn();
		render(PrioritySelector, {
			props: { ...defaultProps, onselect, initialPriority: 'high' },
		});
		await fireEvent.keyDown(window, { key: 'Enter' });
		expect(onselect).toHaveBeenCalledWith('high');
	});

	it('cancels with Escape key', async () => {
		const oncancel = vi.fn();
		render(PrioritySelector, {
			props: { ...defaultProps, oncancel },
		});
		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(oncancel).toHaveBeenCalledOnce();
	});

	it('renders back button when onback is provided', () => {
		render(PrioritySelector, {
			props: { ...defaultProps, onback: vi.fn() },
		});
		expect(screen.getByText('Back', { exact: false })).toBeInTheDocument();
	});

	it('does not render back button when onback is omitted', () => {
		render(PrioritySelector, { props: defaultProps });
		expect(screen.queryByText('Back', { exact: false })).not.toBeInTheDocument();
	});
});

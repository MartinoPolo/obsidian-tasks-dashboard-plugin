import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ActionButton from './ActionButton.svelte';

describe('ActionButton', () => {
	it('renders a button with aria-label', () => {
		render(ActionButton, {
			props: { icon: 'trash', label: 'Delete', onclick: vi.fn() }
		});
		expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
	});

	it('renders the icon inside the button', () => {
		const { container } = render(ActionButton, {
			props: { icon: 'trash', label: 'Delete', onclick: vi.fn() }
		});
		const svg = container.querySelector('svg');
		expect(svg).toBeInTheDocument();
	});

	it('fires onclick when clicked', async () => {
		const handleClick = vi.fn();
		render(ActionButton, {
			props: { icon: 'trash', label: 'Delete', onclick: handleClick }
		});
		await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
		expect(handleClick).toHaveBeenCalledOnce();
	});

	it('applies tdc-btn-faded class when faded', () => {
		render(ActionButton, {
			props: { icon: 'trash', label: 'Delete', faded: true, onclick: vi.fn() }
		});
		const button = screen.getByRole('button', { name: 'Delete' });
		expect(button.classList.contains('tdc-btn-faded')).toBe(true);
	});

	it('does not apply tdc-btn-faded class by default', () => {
		render(ActionButton, {
			props: { icon: 'trash', label: 'Delete', onclick: vi.fn() }
		});
		const button = screen.getByRole('button', { name: 'Delete' });
		expect(button.classList.contains('tdc-btn-faded')).toBe(false);
	});

	it('renders label text when provided', () => {
		render(ActionButton, {
			props: { icon: 'plus', label: 'Add', labelText: 'Add Item', onclick: vi.fn() }
		});
		expect(screen.getByText('Add Item')).toBeInTheDocument();
	});

	it('does not render label text when omitted', () => {
		const { container } = render(ActionButton, {
			props: { icon: 'trash', label: 'Delete', onclick: vi.fn() }
		});
		expect(container.querySelector('.tdc-btn-label')).not.toBeInTheDocument();
	});

	it('applies custom class', () => {
		render(ActionButton, {
			props: { icon: 'trash', label: 'Delete', class: 'custom-class', onclick: vi.fn() }
		});
		const button = screen.getByRole('button', { name: 'Delete' });
		expect(button.classList.contains('custom-class')).toBe(true);
	});

	it('fires oncontextmenu when right-clicked', async () => {
		const handleContext = vi.fn();
		render(ActionButton, {
			props: {
				icon: 'trash',
				label: 'Delete',
				onclick: vi.fn(),
				oncontextmenu: handleContext
			}
		});
		await fireEvent.contextMenu(screen.getByRole('button', { name: 'Delete' }));
		expect(handleContext).toHaveBeenCalledOnce();
	});
});

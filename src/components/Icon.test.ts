import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Icon from './Icon.svelte';

describe('Icon', () => {
	it('renders an SVG element', () => {
		const { container } = render(Icon, { props: { name: 'trash' } });
		const svg = container.querySelector('svg');
		expect(svg).toBeInTheDocument();
	});

	it('applies default size of 16', () => {
		const { container } = render(Icon, { props: { name: 'trash' } });
		const svg = container.querySelector('svg');
		expect(svg).toHaveAttribute('width', '16');
		expect(svg).toHaveAttribute('height', '16');
	});

	it('applies custom size', () => {
		const { container } = render(Icon, { props: { name: 'trash', size: 24 } });
		const svg = container.querySelector('svg');
		expect(svg).toHaveAttribute('width', '24');
		expect(svg).toHaveAttribute('height', '24');
	});

	it('renders correct viewBox', () => {
		const { container } = render(Icon, { props: { name: 'trash' } });
		const svg = container.querySelector('svg');
		expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
	});

	it('applies stroke styling by default', () => {
		const { container } = render(Icon, { props: { name: 'trash' } });
		const svg = container.querySelector('svg');
		expect(svg).toHaveAttribute('stroke', 'currentColor');
		expect(svg).toHaveAttribute('fill', 'none');
	});

	it('applies custom class', () => {
		const { container } = render(Icon, { props: { name: 'trash', class: 'tdc-badge-icon' } });
		const svg = container.querySelector('svg');
		expect(svg?.classList.contains('tdc-badge-icon')).toBe(true);
	});

	it('renders SVG path content for trash icon', () => {
		const { container } = render(Icon, { props: { name: 'trash' } });
		const paths = container.querySelectorAll('svg path');
		expect(paths.length).toBeGreaterThan(0);
	});

	it('renders different icon components for different names', () => {
		const { container: c1 } = render(Icon, { props: { name: 'trash' } });
		const { container: c2 } = render(Icon, { props: { name: 'plus' } });
		const paths1 = c1.querySelector('svg')?.innerHTML;
		const paths2 = c2.querySelector('svg')?.innerHTML;
		expect(paths1).not.toBe(paths2);
	});

	it('has aria-hidden for decorative use', () => {
		const { container } = render(Icon, { props: { name: 'trash' } });
		const svg = container.querySelector('svg');
		expect(svg).toHaveAttribute('aria-hidden', 'true');
	});
});

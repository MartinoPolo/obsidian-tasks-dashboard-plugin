import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ProgressBar from './ProgressBar.svelte';

function makeProgress(done: number, total: number) {
	return {
		done,
		total,
		percentage: total > 0 ? Math.round((done / total) * 100) : 0,
	};
}

describe('ProgressBar', () => {
	it('displays number format', () => {
		render(ProgressBar, {
			props: { progress: makeProgress(3, 10), priority: 'medium', displayMode: 'number' },
		});
		expect(screen.getByText('3/10')).toBeInTheDocument();
	});

	it('displays percentage format', () => {
		render(ProgressBar, {
			props: { progress: makeProgress(5, 10), priority: 'high', displayMode: 'percentage' },
		});
		expect(screen.getByText('50%')).toBeInTheDocument();
	});

	it('displays number-percentage format', () => {
		render(ProgressBar, {
			props: {
				progress: makeProgress(7, 10),
				priority: 'low',
				displayMode: 'number-percentage',
			},
		});
		expect(screen.getByText('7/10 (70%)')).toBeInTheDocument();
	});

	it('displays all format with bar', () => {
		const { container } = render(ProgressBar, {
			props: { progress: makeProgress(8, 10), priority: 'top', displayMode: 'all' },
		});
		expect(screen.getByText('80% (8/10)')).toBeInTheDocument();
		expect(container.querySelector('.tdc-progress-bar')).toBeInTheDocument();
	});

	it('renders progress bar for bar mode', () => {
		const { container } = render(ProgressBar, {
			props: { progress: makeProgress(5, 10), priority: 'medium', displayMode: 'bar' },
		});
		const bar = container.querySelector('.tdc-progress-bar');
		expect(bar).toBeInTheDocument();
		const fill = container.querySelector('.tdc-progress-fill') as HTMLElement;
		expect(fill.style.width).toBe('50%');
	});

	it('does not render bar for number mode', () => {
		const { container } = render(ProgressBar, {
			props: { progress: makeProgress(3, 10), priority: 'low', displayMode: 'number' },
		});
		expect(container.querySelector('.tdc-progress-bar')).not.toBeInTheDocument();
	});

	it('handles zero total gracefully', () => {
		const { container } = render(ProgressBar, {
			props: { progress: makeProgress(0, 0), priority: 'low', displayMode: 'bar' },
		});
		const fill = container.querySelector('.tdc-progress-fill') as HTMLElement;
		expect(fill.style.width).toBe('0%');
	});

	it('applies priority-based CSS class on fill', () => {
		const { container } = render(ProgressBar, {
			props: { progress: makeProgress(5, 10), priority: 'high', displayMode: 'bar' },
		});
		const fill = container.querySelector('.tdc-progress-fill');
		expect(fill?.classList.contains('tdc-progress-fill-high')).toBe(true);
	});
});

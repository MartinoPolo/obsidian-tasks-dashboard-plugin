import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import GitBadge from './GitBadge.svelte';

describe('GitBadge', () => {
	const baseProps = {
		type: 'branch' as const,
		icon: 'gitBranch' as const,
		text: 'main',
		tooltip: 'Branch: main',
	};

	it('renders as span when no href', () => {
		const { container } = render(GitBadge, { props: baseProps });
		const span = container.querySelector('span.tdc-git-badge');
		expect(span).toBeInTheDocument();
		expect(container.querySelector('a')).not.toBeInTheDocument();
	});

	it('renders as anchor when href is provided', () => {
		render(GitBadge, {
			props: { ...baseProps, href: 'https://github.com/repo/tree/main' },
		});
		const link = screen.getByRole('link');
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', 'https://github.com/repo/tree/main');
		expect(link).toHaveAttribute('target', '_blank');
		expect(link).toHaveAttribute('rel', 'noopener noreferrer');
	});

	it('displays the badge text', () => {
		render(GitBadge, { props: baseProps });
		expect(screen.getByText('main')).toBeInTheDocument();
	});

	it('renders icon inside the badge', () => {
		const { container } = render(GitBadge, { props: baseProps });
		const svg = container.querySelector('svg');
		expect(svg).toBeInTheDocument();
	});

	it('applies type-based CSS class for branch', () => {
		const { container } = render(GitBadge, { props: baseProps });
		const badge = container.querySelector('.tdc-git-badge');
		expect(badge?.classList.contains('tdc-git-badge-branch')).toBe(true);
	});

	it('applies type-based CSS class for pr', () => {
		const { container } = render(GitBadge, {
			props: { ...baseProps, type: 'pr' as const },
		});
		const badge = container.querySelector('.tdc-git-badge');
		expect(badge?.classList.contains('tdc-git-badge-pr')).toBe(true);
	});

	it('applies type-based CSS class for issue', () => {
		const { container } = render(GitBadge, {
			props: { ...baseProps, type: 'issue' as const },
		});
		const badge = container.querySelector('.tdc-git-badge');
		expect(badge?.classList.contains('tdc-git-badge-issue')).toBe(true);
	});

	it('applies additional custom class', () => {
		const { container } = render(GitBadge, {
			props: { ...baseProps, class: 'my-custom-class' },
		});
		const badge = container.querySelector('.tdc-git-badge');
		expect(badge?.classList.contains('my-custom-class')).toBe(true);
	});
});

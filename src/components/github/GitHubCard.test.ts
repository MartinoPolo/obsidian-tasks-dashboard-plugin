import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import GitHubCard from './GitHubCard.svelte';
import type { GitHubIssueMetadata } from '../../types';

function makeMetadata(overrides: Partial<GitHubIssueMetadata> = {}): GitHubIssueMetadata {
	return {
		number: 42,
		title: 'Fix bug in parser',
		state: 'open',
		labels: [],
		assignees: [],
		body: 'Description body text',
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-15T00:00:00Z',
		repository: 'owner/repo',
		url: 'https://github.com/owner/repo/issues/42',
		isPR: false,
		...overrides
	};
}

describe('GitHubCard', () => {
	const defaultProps = {
		metadata: makeMetadata(),
		displayMode: 'full' as const,
		onrefresh: vi.fn(),
		onunlink: vi.fn()
	};

	describe('minimal mode', () => {
		it('renders issue number', () => {
			render(GitHubCard, {
				props: { ...defaultProps, displayMode: 'minimal' }
			});
			expect(screen.getByText('#42')).toBeInTheDocument();
		});

		it('renders state text', () => {
			render(GitHubCard, {
				props: { ...defaultProps, displayMode: 'minimal' }
			});
			expect(screen.getByText('Open')).toBeInTheDocument();
		});

		it('links to the issue URL', () => {
			render(GitHubCard, {
				props: { ...defaultProps, displayMode: 'minimal' }
			});
			const link = screen.getByRole('link');
			expect(link).toHaveAttribute('href', 'https://github.com/owner/repo/issues/42');
		});
	});

	describe('compact mode', () => {
		it('renders title and number', () => {
			render(GitHubCard, {
				props: { ...defaultProps, displayMode: 'compact' }
			});
			expect(screen.getByText('#42')).toBeInTheDocument();
			expect(screen.getByText('Fix bug in parser')).toBeInTheDocument();
		});

		it('renders labels with limit', () => {
			const labels = Array.from({ length: 8 }, (_, i) => ({
				name: `label-${i}`,
				color: 'ff0000'
			}));
			render(GitHubCard, {
				props: {
					...defaultProps,
					displayMode: 'compact',
					metadata: makeMetadata({ labels })
				}
			});
			expect(screen.getByText('+3')).toBeInTheDocument();
		});
	});

	describe('full mode', () => {
		it('renders title without truncation', () => {
			render(GitHubCard, { props: defaultProps });
			expect(screen.getByText('Fix bug in parser')).toBeInTheDocument();
		});

		it('shows assignees', () => {
			render(GitHubCard, {
				props: {
					...defaultProps,
					metadata: makeMetadata({ assignees: ['alice', 'bob'] })
				}
			});
			expect(screen.getByText('@alice, @bob')).toBeInTheDocument();
		});

		it('shows repository name', () => {
			render(GitHubCard, { props: defaultProps });
			expect(screen.getByText('owner/repo')).toBeInTheDocument();
		});

		it('shows body text', () => {
			render(GitHubCard, { props: defaultProps });
			expect(screen.getByText('Description body text')).toBeInTheDocument();
		});
	});

	describe('refresh/unlink buttons', () => {
		it('calls onrefresh when refresh button is clicked', async () => {
			const onrefresh = vi.fn();
			const { container } = render(GitHubCard, {
				props: { ...defaultProps, onrefresh }
			});
			const refreshButton = container.querySelector('.tdc-gh-refresh') as HTMLElement;
			await fireEvent.click(refreshButton);
			expect(onrefresh).toHaveBeenCalledOnce();
		});

		it('calls onunlink when unlink button is clicked', async () => {
			const onunlink = vi.fn();
			const { container } = render(GitHubCard, {
				props: { ...defaultProps, onunlink }
			});
			const unlinkButton = container.querySelector('.tdc-gh-unlink') as HTMLElement;
			await fireEvent.click(unlinkButton);
			expect(onunlink).toHaveBeenCalledOnce();
		});

		it('does not render unlink button when onunlink is not provided', () => {
			const { container } = render(GitHubCard, {
				props: { ...defaultProps, onunlink: undefined }
			});
			expect(container.querySelector('.tdc-gh-unlink')).not.toBeInTheDocument();
		});
	});

	describe('state display', () => {
		it('shows Merged for merged PRs', () => {
			render(GitHubCard, {
				props: {
					...defaultProps,
					displayMode: 'minimal',
					metadata: makeMetadata({
						isPR: true,
						prStatus: 'merged',
						state: 'closed'
					})
				}
			});
			expect(screen.getByText('Merged')).toBeInTheDocument();
		});

		it('shows Draft for draft PRs', () => {
			render(GitHubCard, {
				props: {
					...defaultProps,
					displayMode: 'minimal',
					metadata: makeMetadata({ isPR: true, prStatus: 'draft', state: 'open' })
				}
			});
			expect(screen.getByText('Draft')).toBeInTheDocument();
		});

		it('shows Closed for closed issues', () => {
			render(GitHubCard, {
				props: {
					...defaultProps,
					displayMode: 'minimal',
					metadata: makeMetadata({ state: 'closed' })
				}
			});
			expect(screen.getByText('Closed')).toBeInTheDocument();
		});
	});
});

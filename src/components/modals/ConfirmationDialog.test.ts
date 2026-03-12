import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import ConfirmationDialog from './ConfirmationDialog.svelte';

describe('ConfirmationDialog', () => {
	const defaultProps = {
		title: 'Delete Issue',
		message: 'Are you sure?',
		onconfirm: vi.fn(),
		oncancel: vi.fn(),
	};

	it('renders title', () => {
		render(ConfirmationDialog, { props: defaultProps });
		expect(screen.getByText('Delete Issue')).toBeInTheDocument();
	});

	it('renders message', () => {
		render(ConfirmationDialog, { props: defaultProps });
		expect(screen.getByText('Are you sure?')).toBeInTheDocument();
	});

	it('renders default confirm label', () => {
		render(ConfirmationDialog, { props: defaultProps });
		expect(screen.getByText('Confirm', { exact: false })).toBeInTheDocument();
	});

	it('renders custom confirm label', () => {
		render(ConfirmationDialog, {
			props: { ...defaultProps, confirmLabel: 'Delete Forever' },
		});
		expect(screen.getByText('Delete Forever', { exact: false })).toBeInTheDocument();
	});

	it('calls onconfirm when confirm is clicked', async () => {
		const onconfirm = vi.fn();
		const { container } = render(ConfirmationDialog, {
			props: { ...defaultProps, onconfirm },
		});
		const confirmButton = container.querySelector('.tdc-prompt-btn-confirm') as HTMLElement;
		await fireEvent.click(confirmButton);
		expect(onconfirm).toHaveBeenCalledOnce();
	});

	it('calls oncancel when cancel is clicked', async () => {
		const oncancel = vi.fn();
		render(ConfirmationDialog, {
			props: { ...defaultProps, oncancel },
		});
		await fireEvent.click(screen.getByText('Cancel', { exact: false }));
		expect(oncancel).toHaveBeenCalledOnce();
	});

	it('renders warning text when provided', () => {
		render(ConfirmationDialog, {
			props: { ...defaultProps, warningText: '3 unfinished tasks' },
		});
		expect(screen.getByText('3 unfinished tasks')).toBeInTheDocument();
	});

	it('does not render warning when omitted', () => {
		const { container } = render(ConfirmationDialog, { props: defaultProps });
		expect(container.querySelector('.tdc-unfinished-tasks-warning')).not.toBeInTheDocument();
	});

	it('renders checkbox when checkboxLabel is provided', () => {
		render(ConfirmationDialog, {
			props: { ...defaultProps, checkboxLabel: 'Delete files too' },
		});
		expect(screen.getByLabelText('Delete files too')).toBeInTheDocument();
	});

	it('calls oncheckboxchange when checkbox is toggled', async () => {
		const oncheckboxchange = vi.fn();
		render(ConfirmationDialog, {
			props: {
				...defaultProps,
				checkboxLabel: 'Delete files',
				oncheckboxchange,
			},
		});
		await fireEvent.click(screen.getByLabelText('Delete files'));
		expect(oncheckboxchange).toHaveBeenCalled();
	});
});

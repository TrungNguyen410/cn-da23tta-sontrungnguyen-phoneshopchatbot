import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Pagination from './Pagination';

describe('Pagination', () => {
  afterEach(cleanup);

  it('announces the current page', () => {
    render(<Pagination currentPage={2} totalPages={3} onPageChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Trang 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Trang 1' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('renders a bounded sliding window with first, last, and ellipses', () => {
    const { container } = render(<Pagination currentPage={500} totalPages={1000} onPageChange={vi.fn()} />);

    expect(screen.getAllByRole('button')).toHaveLength(9);
    expect(screen.getByRole('button', { name: 'Trang 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trang 1000' })).toBeInTheDocument();
    expect(container.querySelectorAll('span')).toHaveLength(2);
  });

  it('clamps out-of-range navigation and disables next at the last page', () => {
    const onPageChange = vi.fn();
    const { container } = render(<Pagination currentPage={999} totalPages={10} onPageChange={onPageChange} />);

    expect(screen.getByRole('button', { name: 'Trang 10' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Sau' })).toBeDisabled();
    fireEvent.click(container.querySelector('button'));
    expect(onPageChange).toHaveBeenCalledWith(9);
  });

  it('does not render for non-finite totals', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={Number.POSITIVE_INFINITY} onPageChange={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});

import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { productApi } from '../api/productApi';
import ProductCompare from './ProductCompare';

vi.mock('../api/productApi', () => ({ productApi: { getAll: vi.fn() } }));

describe('ProductCompare failure state', () => {
  afterEach(cleanup);

  it('shows a retryable error instead of the empty comparison state', async () => {
    productApi.getAll.mockRejectedValue(new Error('Compare offline'));
    render(<MemoryRouter><ProductCompare /></MemoryRouter>);

    expect(await screen.findByText('Compare offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thử lại/i })).toBeInTheDocument();
    expect(screen.queryByText('Chưa có sản phẩm để so sánh')).not.toBeInTheDocument();
  });
});

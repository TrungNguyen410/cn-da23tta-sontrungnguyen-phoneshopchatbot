import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { accessoryApi } from '../api/accessoryApi';
import { bannerApi } from '../api/bannerApi';
import { productApi } from '../api/productApi';
import Home from './Home';

vi.mock('../api/accessoryApi', () => ({ accessoryApi: { getAll: vi.fn() } }));
vi.mock('../api/bannerApi', () => ({ bannerApi: { getAll: vi.fn() } }));
vi.mock('../api/productApi', () => ({ productApi: { getAll: vi.fn() } }));
vi.mock('../components/common/Loading', () => ({ default: () => <p>Loading</p> }));
vi.mock('../components/common/EmptyState', () => ({
  default: ({ title, description }) => <div><h1>{title}</h1><p>{description}</p></div>,
}));
vi.mock('../components/product/ProductGrid', () => ({ default: () => <div>Product grid</div> }));

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it('shows a retry action when home data cannot be loaded', async () => {
    productApi.getAll.mockRejectedValueOnce(new Error('Network unavailable'));
    accessoryApi.getAll.mockResolvedValue([]);
    bannerApi.getAll.mockResolvedValue([]);

    render(<MemoryRouter><Home /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Không thể tải trang chủ' })).toBeInTheDocument();
    expect(screen.getByText('Không thể tải dữ liệu trang chủ. Vui lòng thử lại.')).toBeInTheDocument();

    productApi.getAll.mockResolvedValueOnce([]);
    accessoryApi.getAll.mockResolvedValueOnce([]);
    bannerApi.getAll.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));

    expect(await screen.findAllByText('Product grid')).toHaveLength(3);
    expect(productApi.getAll).toHaveBeenCalledTimes(2);
  });

  it('removes inactive hero slides from focus and offers a persistent pause control', async () => {
    productApi.getAll.mockResolvedValue([]);
    accessoryApi.getAll.mockResolvedValue([]);
    bannerApi.getAll.mockResolvedValue([
      { id: 'b1', title: 'First', image: 'first.png', link: '/products', active: true },
      { id: 'b2', title: 'Second', image: 'second.png', link: '/accessories', active: true },
    ]);
    render(<MemoryRouter><Home /></MemoryRouter>);

    const first = await screen.findByRole('link', { name: 'First' });
    const second = screen.getByAltText('Second').closest('a');
    expect(first).not.toHaveAttribute('aria-hidden');
    expect(second).toHaveAttribute('aria-hidden', 'true');
    expect(second).toHaveAttribute('tabindex', '-1');
    expect(second).toHaveStyle({ visibility: 'hidden', pointerEvents: 'none' });
    expect(screen.getByRole('button', { name: /tạm dừng banner/i })).toBeInTheDocument();
  });

  it('provides responsive text instead of relying on copy baked into a wide banner image', async () => {
    productApi.getAll.mockResolvedValue([]);
    accessoryApi.getAll.mockResolvedValue([]);
    bannerApi.getAll.mockResolvedValue([
      {
        id: 'b1',
        title: 'Lên đời flagship',
        description: 'Thu cũ đổi mới, trợ giá tốt',
        image: 'wide-banner.png',
        link: '/products',
        active: true,
      },
    ]);

    render(<MemoryRouter><Home /></MemoryRouter>);

    expect(await screen.findByText('Thu cũ đổi mới, trợ giá tốt')).toBeInTheDocument();
    expect(screen.getByText('Khám phá ngay')).toBeInTheDocument();
  });
});

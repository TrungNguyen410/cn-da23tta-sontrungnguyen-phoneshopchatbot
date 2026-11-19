import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PolicyPage from './PolicyPage';

vi.mock('../hooks/useStoreSettings', () => ({ useStoreSettings: () => ({ storeName: 'PhoneShopAI' }) }));

// Same routes as AppRoutes: Meta (Facebook Login) points at /privacy and /xoa-du-lieu.
const renderAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/policies/:type" element={<PolicyPage />} />
      <Route path="/privacy" element={<PolicyPage type="privacy" />} />
      <Route path="/xoa-du-lieu" element={<PolicyPage type="data-deletion" />} />
    </Routes>
  </MemoryRouter>,
);

describe('Policy pages', () => {
  afterEach(cleanup);

  it('serves the privacy policy at /privacy', () => {
    renderAt('/privacy');
    expect(screen.getByRole('heading', { level: 1, name: 'Chính sách quyền riêng tư' })).toBeInTheDocument();
    expect(screen.getByText(/email và public_profile/)).toBeInTheDocument();
  });

  it('serves the data deletion instructions at /xoa-du-lieu', () => {
    renderAt('/xoa-du-lieu');
    expect(screen.getByRole('heading', { level: 1, name: 'Hướng dẫn xóa dữ liệu người dùng' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Gỡ quyền của ứng dụng trên Facebook' })).toBeInTheDocument();
  });

  it('links the policy index to the short URLs', () => {
    renderAt('/policies/warranty');
    expect(screen.getByRole('link', { name: 'Chính sách quyền riêng tư' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Hướng dẫn xóa dữ liệu người dùng' })).toHaveAttribute('href', '/xoa-du-lieu');
  });
});

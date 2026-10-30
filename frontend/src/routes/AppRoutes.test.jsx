import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import AppRoutes from './AppRoutes';

vi.mock('../components/common/Header', () => ({ default: () => <header>Store header</header> }));
vi.mock('../components/common/Footer', () => ({ default: () => <footer>Store footer</footer> }));
vi.mock('../components/chat/ChatWidget', () => ({ default: () => <aside>Chat widget</aside> }));
vi.mock('../pages/ProductDetail', () => ({ default: () => <h1>Product detail route</h1> }));
vi.mock('../pages/Login', () => ({ default: () => <h1>Login route</h1> }));

describe('AppRoutes', () => {
  afterEach(cleanup);

  it('keeps the product detail route available', async () => {
    render(
      <MemoryRouter initialEntries={['/products/product-1']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Product detail route' })).toBeInTheDocument();
  });

  it('offers a skip link that targets the store content', async () => {
    render(
      <MemoryRouter initialEntries={['/products/product-1']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: 'Product detail route' });
    const skipLink = screen.getByRole('link', { name: 'Bỏ qua tới nội dung chính' });
    expect(skipLink).toHaveAttribute('href', '#main-content');
    expect(document.getElementById('main-content')).toHaveAttribute('tabindex', '-1');
  });

  it('redirects an unauthenticated checkout deep link to login', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/checkout']}>
          <AppRoutes />
        </MemoryRouter>
      </AuthProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Login route' })).toBeInTheDocument();
  });
});

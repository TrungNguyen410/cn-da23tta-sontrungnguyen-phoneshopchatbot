import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../context/AuthContext';
import AppRoutes from './AppRoutes';

vi.mock('../components/common/Header', () => ({ default: () => <header>Store header</header> }));
vi.mock('../components/common/Footer', () => ({ default: () => <footer>Store footer</footer> }));
vi.mock('../pages/ProductDetail', () => ({ default: () => <h1>Product detail route</h1> }));
vi.mock('../pages/Login', () => ({ default: () => <h1>Login route</h1> }));

describe('AppRoutes', () => {
  it('keeps the product detail route available', async () => {
    render(
      <MemoryRouter initialEntries={['/products/product-1']}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Product detail route' })).toBeInTheDocument();
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

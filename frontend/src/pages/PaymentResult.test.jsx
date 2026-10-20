import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentApi } from '../api/paymentApi';
import { useCart } from '../hooks/useCart';
import PaymentResult from './PaymentResult';

vi.mock('../hooks/useCart', () => ({ useCart: vi.fn() }));
vi.mock('../api/paymentApi', () => ({
  paymentApi: { verifyVnpayResult: vi.fn() },
}));

describe('PaymentResult', () => {
  const clearCart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useCart.mockReturnValue({ clearCart });
    paymentApi.verifyVnpayResult.mockRejectedValue(new Error('Invalid result proof'));
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  const setPending = (overrides = {}) => {
    sessionStorage.setItem(
      'techphone_pending_payment',
      JSON.stringify({
        orderId: 'order-1',
        orderNumber: 'TP01',
        reference: 'REF01',
        checkoutKey: 'checkout-retry-key',
        createdAt: Date.now(),
        ...overrides,
      }),
    );
  };

  it('keeps the cart for a handcrafted success query without a valid proof', () => {
    setPending();

    render(
      <MemoryRouter initialEntries={['/payment-result?valid=true&code=00&reference=REF01']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /chưa hoàn tất/i }))
      .toBeInTheDocument();
    expect(document.querySelector('.payment-result-card')).toHaveClass('is-failed');
    expect(clearCart).not.toHaveBeenCalled();
    expect(paymentApi.verifyVnpayResult).not.toHaveBeenCalled();
  });

  it('warns when the result proof is invalid', async () => {
    setPending({ reference: 'REF02' });

    render(
      <MemoryRouter initialEntries={['/payment-result?code=00&reference=REF02&proof=tampered']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    await waitFor(() => expect(paymentApi.verifyVnpayResult).toHaveBeenCalledWith('tampered'));
    expect(screen.getByRole('heading', { name: /chưa hoàn tất/i }))
      .toBeInTheDocument();
    expect(clearCart).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: /Thử lại/i })).toHaveAttribute('href', '/checkout');
  });

  it('cleans pending storage only after a server-verified success proof', async () => {
    setPending({ reference: 'REF03' });
    paymentApi.verifyVnpayResult.mockResolvedValue({
      valid: true,
      reference: 'REF03',
      code: '00',
    });

    render(
      <MemoryRouter initialEntries={['/payment-result?reference=REF03&proof=signed-proof']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    await waitFor(() => expect(clearCart).toHaveBeenCalledTimes(1));
    expect(paymentApi.verifyVnpayResult).toHaveBeenCalledWith('signed-proof');
    expect(document.querySelector('.payment-result-card')).toHaveClass('is-accepted');
    await waitFor(() => {
      expect(sessionStorage.getItem('techphone_pending_payment')).toBeNull();
    });
  });

  it('accepts mock success only when its explicit proof matches pending storage', async () => {
    setPending({ reference: 'MOCK-REF', resultProof: 'mock-proof' });

    render(
      <MemoryRouter initialEntries={['/payment-result?mock=true&code=00&reference=MOCK-REF&proof=mock-proof']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    await waitFor(() => expect(clearCart).toHaveBeenCalledTimes(1));
    expect(paymentApi.verifyVnpayResult).not.toHaveBeenCalled();
    expect(document.querySelector('.payment-result-card')).toHaveClass('is-accepted');
  });

  it('keeps the cart when a verified callback does not match pending reference', async () => {
    setPending({ reference: 'ANOTHER-REFERENCE' });
    paymentApi.verifyVnpayResult.mockResolvedValue({
      valid: true,
      reference: 'REF04',
      code: '00',
    });

    render(
      <MemoryRouter initialEntries={['/payment-result?reference=REF04&proof=signed-proof']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    await waitFor(() => expect(paymentApi.verifyVnpayResult).toHaveBeenCalled());
    expect(clearCart).not.toHaveBeenCalled();
    expect(document.querySelector('.payment-result-card')).toHaveClass('is-failed');
    expect(screen.getByRole('link', { name: /Thử lại/i })).toHaveAttribute('href', '/checkout');
  });

  it('keeps the cart, pending key, and retry route after a cancelled callback', async () => {
    setPending({ reference: 'REF05' });
    paymentApi.verifyVnpayResult.mockResolvedValue({
      valid: true,
      reference: 'REF05',
      code: '24',
    });

    render(
      <MemoryRouter initialEntries={['/payment-result?reference=REF05&proof=signed-cancel']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    await waitFor(() => expect(paymentApi.verifyVnpayResult).toHaveBeenCalled());
    expect(clearCart).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem('techphone_pending_payment')).checkoutKey)
      .toBe('checkout-retry-key');
    expect(screen.getByRole('link', { name: /Thử lại/i })).toHaveAttribute('href', '/checkout');
  });

  it('keeps the cart and failed styling after a stale success callback', async () => {
    setPending({
      reference: 'REF06',
      createdAt: Date.now() - (3 * 60 * 60 * 1000),
    });
    paymentApi.verifyVnpayResult.mockResolvedValue({
      valid: true,
      reference: 'REF06',
      code: '00',
    });

    render(
      <MemoryRouter initialEntries={['/payment-result?reference=REF06&proof=signed-stale']}>
        <PaymentResult />
      </MemoryRouter>,
    );

    await waitFor(() => expect(paymentApi.verifyVnpayResult).toHaveBeenCalled());
    expect(clearCart).not.toHaveBeenCalled();
    expect(document.querySelector('.payment-result-card')).toHaveClass('is-failed');
    expect(sessionStorage.getItem('techphone_pending_payment')).not.toBeNull();
  });

  it('survives malformed pending payment storage without clearing the cart', () => {
    sessionStorage.setItem('techphone_pending_payment', '{broken');

    expect(() => render(
      <MemoryRouter initialEntries={['/payment-result?code=24']}>
        <PaymentResult />
      </MemoryRouter>,
    )).not.toThrow();
    expect(clearCart).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('techphone_pending_payment')).toBe('{broken');
  });
});

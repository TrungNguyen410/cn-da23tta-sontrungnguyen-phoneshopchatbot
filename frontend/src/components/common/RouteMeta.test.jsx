import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import RouteMeta from './RouteMeta';

function RouteMetaHarness() {
  const navigate = useNavigate();
  return (
    <>
      <RouteMeta />
      <button type="button" onClick={() => navigate('/contact')}>Đến liên hệ</button>
    </>
  );
}

describe('RouteMeta', () => {
  afterEach(() => {
    cleanup();
    document.head.querySelectorAll('meta[property^="og:"], meta[name="twitter:card"], link[rel="canonical"]').forEach((node) => node.remove());
  });

  it('replaces product metadata when navigation moves to another route', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/products/phone-1']}>
        <RouteMetaHarness />
      </MemoryRouter>,
    );

    expect(document.title).toBe('Chi tiết điện thoại | TechPhone');
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'http://localhost:3000/products/phone-1',
    );

    await user.click(screen.getByRole('button', { name: 'Đến liên hệ' }));

    expect(document.title).toBe('Liên hệ & cửa hàng | TechPhone');
    expect(document.head.querySelector('meta[property="og:description"]')).toHaveAttribute(
      'content',
      'Liên hệ TechPhone qua hotline, email hoặc địa chỉ cửa hàng.',
    );
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'http://localhost:3000/contact',
    );
  });
});

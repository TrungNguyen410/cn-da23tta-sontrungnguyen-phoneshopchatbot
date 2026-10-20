import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { usePageMeta } from './usePageMeta';

function MetaHarness({ product = true }) {
  usePageMeta(product
    ? {
        title: 'Điện thoại thử nghiệm',
        description: 'Mô tả sản phẩm thử nghiệm.',
        image: '/phone.png',
        canonicalPath: '/products/phone-1',
        type: 'product',
        structuredData: { '@context': 'https://schema.org', '@type': 'Product', name: 'Điện thoại thử nghiệm' },
      }
    : {
        title: 'Liên hệ',
        description: 'Thông tin liên hệ cửa hàng.',
        canonicalPath: '/contact',
      });
  return null;
}

describe('usePageMeta', () => {
  afterEach(() => {
    cleanup();
    document.getElementById('page-structured-data')?.remove();
    document.head.querySelectorAll('meta[property^="og:"], meta[name="twitter:card"], link[rel="canonical"]').forEach((node) => node.remove());
  });

  it('removes product-only image and structured data when metadata changes', () => {
    const view = render(<MetaHarness />);

    expect(document.head.querySelector('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'http://localhost:3000/phone.png',
    );
    expect(document.getElementById('page-structured-data')).toHaveTextContent('"@type":"Product"');

    view.rerender(<MetaHarness product={false} />);

    expect(document.title).toBe('Liên hệ | TechPhone');
    expect(document.head.querySelector('meta[property="og:image"]')).not.toBeInTheDocument();
    expect(document.getElementById('page-structured-data')).not.toBeInTheDocument();
    expect(document.head.querySelector('meta[property="og:type"]')).toHaveAttribute('content', 'website');
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'http://localhost:3000/contact',
    );
  });
});

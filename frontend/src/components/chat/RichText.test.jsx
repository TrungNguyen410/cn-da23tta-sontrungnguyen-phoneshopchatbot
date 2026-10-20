import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import RichText from './RichText';

describe('RichText', () => {
  afterEach(cleanup);

  it('renders bold text, bullet lists and paragraphs', () => {
    const { container } = render(<RichText text={'Gợi ý:\n- **Máy A**: 5 triệu\n- Máy B\nKết luận'} />);

    expect(screen.getByText('Máy A').tagName).toBe('STRONG');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('never renders model output as HTML', () => {
    const { container } = render(<RichText text={'<img src=x onerror=alert(1)> **ok**'} />);

    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
  });
});

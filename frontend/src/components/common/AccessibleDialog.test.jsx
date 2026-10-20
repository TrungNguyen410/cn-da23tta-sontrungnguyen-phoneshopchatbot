import { useRef, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import AccessibleDialog from './AccessibleDialog';

function DialogHarness() {
  const [open, setOpen] = useState(false);
  const initialFocusRef = useRef(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open dialog</button>
      <AccessibleDialog
        open={open}
        title="Test dialog"
        initialFocusRef={initialFocusRef}
        onClose={() => setOpen(false)}
      >
        <button ref={initialFocusRef} type="button">First action</button>
        <button type="button">Second action</button>
      </AccessibleDialog>
    </>
  );
}

describe('AccessibleDialog', () => {
  afterEach(cleanup);

  it('focuses on open, closes with Escape, and restores the trigger', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Test dialog' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'First action' })).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes when the native backdrop area is clicked', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);
    await user.click(screen.getByRole('button', { name: 'Open dialog' }));

    fireEvent.click(screen.getByRole('dialog'), { clientX: -1, clientY: -1 });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

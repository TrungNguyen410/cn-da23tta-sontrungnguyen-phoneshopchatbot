import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { orderApi } from '../../api/orderApi';
import { paymentApi } from '../../api/paymentApi';
import BankTransferPanel, { buildVietQrUrl } from './BankTransferPanel';

vi.mock('../../api/orderApi', () => ({ orderApi: { getById: vi.fn() } }));
vi.mock('../../api/paymentApi', () => ({ paymentApi: { getConfig: vi.fn() } }));

const display = {
  bankName: 'Test Bank',
  bankBin: '970436',
  accountNumber: '123456789',
  accountName: 'TECHPHONE TEST',
};
const order = {
  id: 'order-1',
  orderNumber: 'TP2610200001',
  total: 1030000,
  paymentMethod: 'bank',
  paymentStatus: 'pending',
};

describe('BankTransferPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('builds a VietQR image URL with amount and order number', () => {
    const url = buildVietQrUrl(display, 1030000, 'TP2610200001');
    expect(url).toContain('970436-123456789');
    expect(url).toContain('amount=1030000');
    expect(url).toContain('addInfo=TP2610200001');
  });

  it('shows the order number as transfer content', async () => {
    paymentApi.getConfig.mockResolvedValue({ providers: { bank: { enabled: true, autoConfirm: false, display } } });

    render(<BankTransferPanel order={order} />);

    expect(await screen.findByText('Test Bank')).toBeInTheDocument();
    expect(screen.getByText('TP2610200001')).toBeInTheDocument();
    expect(screen.getByText(/Nhân viên TechPhone sẽ đối soát/)).toBeInTheDocument();
  });

  it('polls the order and switches to paid when SePay confirms it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    paymentApi.getConfig.mockResolvedValue({ providers: { bank: { enabled: true, autoConfirm: true, display } } });
    orderApi.getById.mockResolvedValue({ ...order, paymentStatus: 'paid', status: 'confirmed' });
    const onPaid = vi.fn();

    render(<BankTransferPanel order={order} onPaid={onPaid} />);
    expect(await screen.findByText(/tự động xác nhận/)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(await screen.findByText('Đã nhận thanh toán')).toBeInTheDocument();
    expect(onPaid).toHaveBeenCalledWith(expect.objectContaining({ paymentStatus: 'paid' }));
  });

  it('renders nothing when bank transfer is disabled', async () => {
    paymentApi.getConfig.mockResolvedValue({ providers: { bank: { enabled: false } } });

    const { container } = render(<BankTransferPanel order={order} />);
    await act(async () => {});

    expect(container).toBeEmptyDOMElement();
  });
});

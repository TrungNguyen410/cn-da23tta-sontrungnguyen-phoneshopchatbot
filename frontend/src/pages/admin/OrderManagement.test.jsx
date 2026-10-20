import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { adminApi } from '../../api/adminApi';
import { orderApi } from '../../api/orderApi';
import { paymentApi } from '../../api/paymentApi';
import OrderManagement from './OrderManagement';
import { toast } from 'react-toastify';

vi.mock('../../api/adminApi', () => ({ adminApi: { getOrders: vi.fn() } }));
vi.mock('../../api/orderApi', () => ({ orderApi: { updateStatus: vi.fn() } }));
vi.mock('../../api/paymentApi', () => ({ paymentApi: { reconcileManualPayment: vi.fn() } }));
vi.mock('react-toastify', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const pendingOrder = {
  id: 'order-1',
  orderNumber: 'TP260601',
  createdAt: '2026-06-01T00:00:00Z',
  customer: {
    fullName: 'Nguyen Van A',
    phone: '0911111111',
    address: 'Test address',
  },
  items: [{
    id: 'item-1',
    name: 'Phone',
    image: 'phone.png',
    price: 1000000,
    quantity: 1,
  }],
  total: 1000000,
  status: 'pending',
  paymentMethod: 'momo',
  paymentStatus: 'pending',
};

describe('OrderManagement payment method', () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    adminApi.getOrders.mockResolvedValue({
      items: [pendingOrder],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('shows payment method in the list and detail', async () => {
    const { container } = render(<OrderManagement />);
    expect(await screen.findByText('Ví điện tử MoMo')).toBeInTheDocument();
    fireEvent.click(container.querySelector('.table-view-button'));
    expect(screen.getByText('Phương thức thanh toán')).toBeInTheDocument();
    expect(screen.getAllByText('Ví điện tử MoMo')).toHaveLength(2);
  });

  it('offers only legal next states and restores the current state after a failed update', async () => {
    orderApi.updateStatus.mockRejectedValue(Object.assign(new Error('Transition rejected'), {
      friendlyMessage: 'Transition rejected',
    }));
    render(<OrderManagement />);

    const select = await screen.findByRole('combobox', { name: /trạng thái đơn TP260601/i });
    expect([...select.options].map((option) => option.value)).toEqual([
      'pending',
      'confirmed',
      'cancelled',
    ]);

    fireEvent.change(select, { target: { value: 'confirmed' } });
    expect(select).toBeDisabled();
    await waitFor(() => expect(select).not.toBeDisabled());
    expect(select).toHaveValue('pending');
  });

  it('reports that the mutation succeeded when only the list refresh fails', async () => {
    orderApi.updateStatus.mockResolvedValue({ ...pendingOrder, status: 'confirmed' });
    adminApi.getOrders
      .mockResolvedValueOnce({
        items: [pendingOrder],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })
      .mockRejectedValueOnce(new Error('refresh unavailable'));
    render(<OrderManagement />);

    fireEvent.change(await screen.findByRole('combobox', { name: /TP260601/ }), {
      target: { value: 'confirmed' },
    });

    await waitFor(() => expect(orderApi.updateStatus).toHaveBeenCalledWith('order-1', 'confirmed'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/đã cập nhật.*không thể tải lại/i),
    ));
    const updatedSelect = screen.getByRole('combobox', { name: /TP260601/ });
    expect(updatedSelect).toHaveValue('confirmed');
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalledWith('refresh unavailable');

    fireEvent.change(updatedSelect, { target: { value: 'confirmed' } });
    expect(orderApi.updateStatus).toHaveBeenCalledTimes(1);
  });

  it('removes a transitioned order from the active status filter when refresh fails', async () => {
    orderApi.updateStatus.mockResolvedValue({ ...pendingOrder, status: 'confirmed' });
    adminApi.getOrders
      .mockResolvedValueOnce({
        items: [pendingOrder],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        items: [pendingOrder],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })
      .mockRejectedValueOnce(new Error('refresh unavailable'));
    const { container } = render(<OrderManagement />);
    await screen.findByText(pendingOrder.orderNumber);

    fireEvent.change(container.querySelector('.admin-page-toolbar > select'), {
      target: { value: 'pending' },
    });
    await waitFor(() => expect(adminApi.getOrders).toHaveBeenLastCalledWith({
      page: 1, limit: 20, search: '', status: 'pending',
    }));
    fireEvent.change(screen.getByRole('combobox', { name: /TP260601/ }), {
      target: { value: 'confirmed' },
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/đã cập nhật.*không thể tải lại/i),
    ));
    expect(screen.queryByText(pendingOrder.orderNumber)).not.toBeInTheDocument();
    expect(container.querySelector('.admin-table-title span')).toHaveTextContent(/^0\s/);
    expect(screen.queryByRole('button', { name: 'Trang 0' })).not.toBeInTheDocument();
  });

  it('renders reconciliation actions only for eligible bank and MoMo payments', async () => {
    const { container } = render(<OrderManagement />);
    await screen.findByText(pendingOrder.orderNumber);
    fireEvent.click(container.querySelector('.table-view-button'));

    expect(screen.getByRole('button', { name: /confirm paid payment/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark payment failed/i })).toBeInTheDocument();

    cleanup();
    adminApi.getOrders.mockResolvedValue({
      items: [{
        ...pendingOrder,
        id: 'card-order',
        orderNumber: 'TP260602',
        paymentMethod: 'card',
      }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    const cardView = render(<OrderManagement />);
    await screen.findByText('TP260602');
    fireEvent.click(cardView.container.querySelector('.table-view-button'));
    expect(screen.queryByRole('button', { name: /confirm paid payment/i })).not.toBeInTheDocument();
  });

  it('requires a reference for paid and sends only the bounded reconciliation payload', async () => {
    paymentApi.reconcileManualPayment.mockResolvedValue({
      ...pendingOrder,
      paymentStatus: 'paid',
      paymentReference: 'MOMO-REF-01',
      status: 'confirmed',
      paymentAudit: {
        confirmedBy: 'admin-1',
        confirmedAt: '2026-08-05T10:00:00.000Z',
        note: 'Matched MoMo statement',
      },
    });
    const { container } = render(<OrderManagement />);
    await screen.findByText(pendingOrder.orderNumber);
    fireEvent.click(container.querySelector('.table-view-button'));

    fireEvent.click(screen.getByRole('button', { name: /confirm paid payment/i }));
    expect(paymentApi.reconcileManualPayment).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/payment reference/i), {
      target: { value: ' MOMO-REF-01 ' },
    });
    fireEvent.change(screen.getByLabelText(/reconciliation note/i), {
      target: { value: 'Matched MoMo statement' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm paid payment/i }));

    await waitFor(() => expect(paymentApi.reconcileManualPayment).toHaveBeenCalledWith(
      pendingOrder.id,
      {
        status: 'paid',
        reference: 'MOMO-REF-01',
        note: 'Matched MoMo statement',
      },
    ));
  });

  it('allows a failed reconciliation without a reference', async () => {
    paymentApi.reconcileManualPayment.mockResolvedValue({
      ...pendingOrder,
      paymentStatus: 'failed',
      paymentAudit: {
        confirmedBy: 'admin-1',
        confirmedAt: '2026-08-05T10:00:00.000Z',
        note: '',
      },
    });
    const { container } = render(<OrderManagement />);
    await screen.findByText(pendingOrder.orderNumber);
    fireEvent.click(container.querySelector('.table-view-button'));
    fireEvent.click(screen.getByRole('button', { name: /mark payment failed/i }));

    await waitFor(() => expect(paymentApi.reconcileManualPayment).toHaveBeenCalledWith(
      pendingOrder.id,
      { status: 'failed', reference: '', note: '' },
    ));
  });

  it('shows finalized audit data read-only and hides reconciliation actions', async () => {
    adminApi.getOrders.mockResolvedValue({
      items: [{
        ...pendingOrder,
        paymentStatus: 'paid',
        paymentReference: 'MOMO-AUDIT-01',
        paymentAudit: {
          confirmedBy: 'admin-auditor',
          confirmedAt: '2026-08-05T10:00:00.000Z',
          note: 'Matched statement row 42',
        },
      }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    const { container } = render(<OrderManagement />);
    await screen.findByText(pendingOrder.orderNumber);
    fireEvent.click(container.querySelector('.table-view-button'));

    expect(screen.getByText('MOMO-AUDIT-01')).toBeInTheDocument();
    expect(screen.getByText('admin-auditor')).toBeInTheDocument();
    expect(screen.getByText('Matched statement row 42')).toBeInTheDocument();
    expect(screen.queryByLabelText(/payment reference/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /confirm paid payment/i })).not.toBeInTheDocument();
  });

  it('loads the selected server page', async () => {
    adminApi.getOrders.mockResolvedValue({
      items: [pendingOrder],
      pagination: { page: 1, limit: 20, total: 21, totalPages: 2 },
    });
    render(<OrderManagement />);

    fireEvent.click(await screen.findByRole('button', { name: 'Trang 2' }));

    await waitFor(() => expect(adminApi.getOrders).toHaveBeenLastCalledWith({
      page: 2, limit: 20, search: '', status: '',
    }));
  });

  it('debounces search and resets page when search or status changes', async () => {
    adminApi.getOrders.mockResolvedValue({
      items: [pendingOrder],
      pagination: { page: 1, limit: 20, total: 21, totalPages: 2 },
    });
    const { container } = render(<OrderManagement />);
    await screen.findByText(pendingOrder.orderNumber);
    fireEvent.click(screen.getByRole('button', { name: 'Trang 2' }));
    await waitFor(() => expect(adminApi.getOrders).toHaveBeenLastCalledWith({
      page: 2, limit: 20, search: '', status: '',
    }));
    vi.useFakeTimers();

    fireEvent.change(container.querySelector('.admin-search input'), { target: { value: 'TP26' } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    expect(adminApi.getOrders).toHaveBeenLastCalledWith({
      page: 1, limit: 20, search: 'TP26', status: '',
    });
    vi.useRealTimers();

    fireEvent.change(container.querySelector('.admin-page-toolbar > select'), { target: { value: 'pending' } });
    await waitFor(() => expect(adminApi.getOrders).toHaveBeenLastCalledWith({
      page: 1, limit: 20, search: 'TP26', status: 'pending',
    }));
  });

  it('ignores a stale request that resolves after a newer request', async () => {
    let resolvePageTwo;
    const stalePage = new Promise((resolve) => { resolvePageTwo = resolve; });
    adminApi.getOrders
      .mockResolvedValueOnce({
        items: [pendingOrder],
        pagination: { page: 1, limit: 20, total: 21, totalPages: 2 },
      })
      .mockReturnValueOnce(stalePage)
      .mockResolvedValueOnce({
        items: [{ ...pendingOrder, id: 'new-order', orderNumber: 'TPNEW0001' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    const { container } = render(<OrderManagement />);
    fireEvent.click(await screen.findByRole('button', { name: 'Trang 2' }));
    vi.useFakeTimers();
    fireEvent.change(container.querySelector('.admin-search input'), { target: { value: 'new' } });
    await act(() => vi.advanceTimersByTimeAsync(300));
    vi.useRealTimers();
    expect(await screen.findByText('TPNEW0001')).toBeInTheDocument();

    await act(async () => resolvePageTwo({
      items: [{ ...pendingOrder, id: 'stale-order', orderNumber: 'TPSTALE01' }],
      pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
    }));

    expect(screen.queryByText('TPSTALE01')).not.toBeInTheDocument();
    expect(screen.getByText('TPNEW0001')).toBeInTheDocument();
  });

  it('refetches the active status filter and clamps an emptied last page after status update', async () => {
    let statusUpdated = false;
    const remainingPendingOrder = {
      ...pendingOrder,
      id: 'remaining-pending',
      orderNumber: 'TPPENDING2',
    };
    adminApi.getOrders.mockImplementation(({ page, status }) => {
      if (!status) {
        return Promise.resolve({
          items: [pendingOrder],
          pagination: { page: 1, limit: 20, total: 21, totalPages: 2 },
        });
      }
      if (page === 2 && statusUpdated) {
        return Promise.resolve({
          items: [],
          pagination: { page: 2, limit: 20, total: 1, totalPages: 1 },
        });
      }
      if (page === 2) {
        return Promise.resolve({
          items: [pendingOrder],
          pagination: { page: 2, limit: 20, total: 21, totalPages: 2 },
        });
      }
      return Promise.resolve({
        items: statusUpdated ? [remainingPendingOrder] : [pendingOrder],
        pagination: {
          page: 1,
          limit: 20,
          total: statusUpdated ? 1 : 21,
          totalPages: statusUpdated ? 1 : 2,
        },
      });
    });
    orderApi.updateStatus.mockImplementation(async () => {
      statusUpdated = true;
      return { ...pendingOrder, status: 'confirmed' };
    });
    const { container } = render(<OrderManagement />);
    await screen.findByText(pendingOrder.orderNumber);
    fireEvent.change(container.querySelector('.admin-page-toolbar > select'), {
      target: { value: 'pending' },
    });
    await waitFor(() => expect(adminApi.getOrders).toHaveBeenLastCalledWith({
      page: 1, limit: 20, search: '', status: 'pending',
    }));
    fireEvent.click(screen.getByRole('button', { name: 'Trang 2' }));
    await waitFor(() => expect(adminApi.getOrders).toHaveBeenLastCalledWith({
      page: 2, limit: 20, search: '', status: 'pending',
    }));

    fireEvent.change(screen.getByRole('combobox', { name: /TP260601/ }), {
      target: { value: 'confirmed' },
    });

    await waitFor(() => expect(adminApi.getOrders).toHaveBeenLastCalledWith({
      page: 1, limit: 20, search: '', status: 'pending',
    }));
    expect(await screen.findByText(remainingPendingOrder.orderNumber)).toBeInTheDocument();
    expect(screen.queryByText(pendingOrder.orderNumber)).not.toBeInTheDocument();
    expect(container.querySelector('.admin-table-title span')).toHaveTextContent(/^1\s/);
  });

  it('refetches the latest filter when it changes during a status update', async () => {
    let resolveUpdate;
    const updatedOrder = { ...pendingOrder, status: 'confirmed' };
    const confirmedOrder = {
      ...updatedOrder,
      id: 'confirmed-order',
      orderNumber: 'TPCONFIRMED2',
    };
    adminApi.getOrders.mockImplementation(({ page, status }) => Promise.resolve({
      items: status === 'confirmed' ? [confirmedOrder] : [pendingOrder],
      pagination: { page, limit: 20, total: 1, totalPages: 1 },
    }));
    orderApi.updateStatus.mockReturnValue(new Promise((resolve) => { resolveUpdate = resolve; }));
    const { container } = render(<OrderManagement />);
    await screen.findByText(pendingOrder.orderNumber);
    fireEvent.change(container.querySelector('.admin-page-toolbar > select'), {
      target: { value: 'pending' },
    });
    await waitFor(() => expect(adminApi.getOrders).toHaveBeenLastCalledWith({
      page: 1, limit: 20, search: '', status: 'pending',
    }));
    fireEvent.change(screen.getByRole('combobox', { name: /TP260601/ }), {
      target: { value: 'confirmed' },
    });
    fireEvent.change(container.querySelector('.admin-page-toolbar > select'), {
      target: { value: 'confirmed' },
    });
    await waitFor(() => expect(adminApi.getOrders).toHaveBeenLastCalledWith({
      page: 1, limit: 20, search: '', status: 'confirmed',
    }));
    const callsBeforeMutationSettles = adminApi.getOrders.mock.calls.length;

    await act(async () => resolveUpdate(updatedOrder));
    await waitFor(() => expect(adminApi.getOrders).toHaveBeenCalledTimes(callsBeforeMutationSettles + 1));

    expect(adminApi.getOrders).toHaveBeenLastCalledWith({
      page: 1, limit: 20, search: '', status: 'confirmed',
    });
    expect(screen.getByText(confirmedOrder.orderNumber)).toBeInTheDocument();
  });
});

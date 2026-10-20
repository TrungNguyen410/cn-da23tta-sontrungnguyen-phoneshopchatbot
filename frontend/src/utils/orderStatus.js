export const ORDER_STATUS_MAP = {
  pending: { label: 'Chờ xác nhận', className: 'status-pending' },
  confirmed: { label: 'Đã xác nhận', className: 'status-confirmed' },
  shipping: { label: 'Đang giao hàng', className: 'status-shipping' },
  delivered: { label: 'Đã giao hàng', className: 'status-delivered' },
  completed: { label: 'Hoàn thành', className: 'status-completed' },
  cancelled: { label: 'Đã hủy', className: 'status-cancelled' },
};

export const getOrderStatus = (status) => ORDER_STATUS_MAP[status] || ORDER_STATUS_MAP.pending;

export const ORDER_STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'cancelled'],
  shipping: ['delivered', 'completed'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};

export const getNextOrderStatuses = (status) => ORDER_STATUS_TRANSITIONS[status] || [];

export const ORDER_TIMELINE = ['pending', 'confirmed', 'shipping', 'delivered', 'completed'];

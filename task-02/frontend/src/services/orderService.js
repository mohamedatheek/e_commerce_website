import api, { unwrapList, unwrapPayload } from './api';

export async function fetchOrders() {
  const response = await api.get('/orders');
  return unwrapList(response).map((order) => ({
    ...order,
    items: Array.isArray(order.items) ? order.items : [],
  }));
}

export async function fetchOrder(id) {
  const response = await api.get(`/orders/${id}`);
  const order = unwrapPayload(response);
  if (!order || typeof order !== 'object') {
    return null;
  }
  return {
    ...order,
    items: Array.isArray(order.items) ? order.items : [],
    history: Array.isArray(order.history) ? order.history : [],
  };
}

export async function cancelOrder(id) {
  const response = await api.post(`/orders/${id}/cancel`);
  return unwrapPayload(response);
}

export async function refundOrder(id) {
  const response = await api.post(`/orders/${id}/refund`);
  return unwrapPayload(response);
}

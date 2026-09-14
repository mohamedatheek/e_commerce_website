import api from './api';

export async function fetchOrders() {
  const { data } = await api.get('/orders');
  return data.data;
}

export async function fetchOrder(id) {
  const { data } = await api.get(`/orders/${id}`);
  return data.data;
}

export async function cancelOrder(id) {
  const { data } = await api.post(`/orders/${id}/cancel`);
  return data.data;
}

export async function refundOrder(id) {
  const { data } = await api.post(`/orders/${id}/refund`);
  return data.data;
}

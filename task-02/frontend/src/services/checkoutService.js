import api from './api';

export async function createCheckout(items) {
  const { data } = await api.post('/checkout', {
    items: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
  });
  return data.data;
}

export async function fetchCheckout(id) {
  const { data } = await api.get(`/checkout/${id}`);
  return data.data;
}

export async function payCheckout(id, outcome) {
  const { data } = await api.post(`/checkout/${id}/payment`, { outcome });
  return data.data;
}

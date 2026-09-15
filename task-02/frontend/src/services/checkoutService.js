import api, { unwrapPayload } from './api';

export async function createCheckout(items) {
  const payload = Array.isArray(items) ? items : [];
  const response = await api.post('/checkout', {
    items: payload.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
  });
  return unwrapPayload(response);
}

export async function fetchCheckout(id) {
  const response = await api.get(`/checkout/${id}`);
  const checkout = unwrapPayload(response) || {};
  return {
    ...checkout,
    items: Array.isArray(checkout.items) ? checkout.items : [],
  };
}

export async function payCheckout(id, outcome) {
  const response = await api.post(`/checkout/${id}/payment`, { outcome });
  return unwrapPayload(response);
}

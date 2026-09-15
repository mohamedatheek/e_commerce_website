import api, { unwrapList, unwrapPayload } from './api';

export async function fetchProducts(params) {
  const response = await api.get('/products', { params });
  return unwrapList(response);
}

export async function fetchProduct(id) {
  const response = await api.get(`/products/${id}`);
  return unwrapPayload(response);
}

export async function fetchCategories() {
  const response = await api.get('/products/categories');
  return unwrapList(response);
}

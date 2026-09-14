import api from './api';

export async function fetchProducts(params) {
  const { data } = await api.get('/products', { params });
  return data.data;
}

export async function fetchProduct(id) {
  const { data } = await api.get(`/products/${id}`);
  return data.data;
}

export async function fetchCategories() {
  const { data } = await api.get('/products/categories');
  return data.data;
}

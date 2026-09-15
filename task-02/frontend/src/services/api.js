import axios from 'axios';
import { API_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 12000,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Request failed';
    const wrapped = new Error(message);
    wrapped.status = error.response?.status;
    wrapped.payload = error.response?.data;
    throw wrapped;
  }
);

export function unwrapPayload(response) {
  const body = response?.data;
  if (Array.isArray(body)) {
    return body;
  }
  if (body && typeof body === 'object' && 'data' in body) {
    return body.data;
  }
  return body;
}

export function unwrapList(response) {
  const value = unwrapPayload(response);
  return Array.isArray(value) ? value : [];
}

export default api;

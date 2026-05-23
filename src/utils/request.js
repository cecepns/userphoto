import { apiFetch } from './api';

export const apiGet = (path, options) => apiFetch(path, { ...options, method: 'GET' });
export const apiPost = (path, body, options) =>
  apiFetch(path, { ...options, method: 'POST', body: JSON.stringify(body) });
export const apiPut = (path, body, options) =>
  apiFetch(path, { ...options, method: 'PUT', body: JSON.stringify(body) });
export const apiDelete = (path, options) => apiFetch(path, { ...options, method: 'DELETE' });

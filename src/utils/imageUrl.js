import { API_BASE } from './endpoints';
export { API_BASE };

export function imageUrl(value) {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  return `${API_BASE}/uploads-weddingsapp/${value}`;
}


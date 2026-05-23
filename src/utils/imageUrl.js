export const API_BASE = 'https://api.kingcreativestudio.my.id/chekusphoto';

export function imageUrl(value) {
  if (!value) return '';
  if (value.startsWith('http')) return value;
  return `${API_BASE}/uploads-weddingsapp/${value}`;
}


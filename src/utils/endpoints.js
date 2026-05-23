export const API_BASE =
  import.meta.env.VITE_API_URL || 'https://api.kingcreativestudio.my.id/chekusphoto';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/admin/login',
    STATS: '/api/admin/stats',
  },
  ADMIN: {
    PACKAGE_SALES: '/api/admin/package-sales',
    FINANCE_SUMMARY: '/api/admin/finance/summary',
    FINANCE_SETTINGS: '/api/admin/finance/settings',
    FINANCE_ORDERS: '/api/admin/finance/orders',
  },
  ORDERS: {
    LIST: '/api/orders',
    CREATE: '/api/orders',
    VENDOR: (id) => `/api/orders/${id}/vendor`,
  },
  CUSTOM_REQUESTS: {
    LIST: '/api/custom-requests',
    CREATE: '/api/custom-requests',
    VENDOR: (id) => `/api/custom-requests/${id}/vendor`,
  },
  VENDORS: {
    LIST: '/api/vendors',
    ALL: '/api/vendors/all',
    CREATE: '/api/vendors',
    UPDATE: (id) => `/api/vendors/${id}`,
    DELETE: (id) => `/api/vendors/${id}`,
  },
  VENDOR_CALENDAR: '/api/vendor-calendar',
  ORDER_PROGRESS: {
    LIST: '/api/order-progress',
    CREATE: '/api/order-progress',
    UPDATE: (id) => `/api/order-progress/${id}`,
    DELETE: (id) => `/api/order-progress/${id}`,
    PUBLIC: (source, id) => `/api/order-progress/public/${source}/${id}`,
  },
  DETAIL_ACARA: {
    LIST: '/api/detail-acara',
    DETAIL: (id) => `/api/detail-acara/${id}`,
    CREATE: '/api/detail-acara',
    FROM_ORDER: '/api/detail-acara/from-order',
    UPDATE: (id) => `/api/detail-acara/${id}`,
    DELETE: (id) => `/api/detail-acara/${id}`,
  },
  FREELANCERS: {
    LIST: '/api/freelancers-inhouse',
    ALL: '/api/freelancers-inhouse/all',
    CREATE: '/api/freelancers-inhouse',
    UPDATE: (id) => `/api/freelancers-inhouse/${id}`,
    DELETE: (id) => `/api/freelancers-inhouse/${id}`,
  },
  REFERENCE_SOURCES: '/api/reference-sources',
};

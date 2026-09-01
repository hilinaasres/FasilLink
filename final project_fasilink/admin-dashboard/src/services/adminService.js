import adminApi from './api';

export const getSummary = async () => {
  const response = await adminApi.get('/admin/summary');
  return response.data;
};

export const getAnalytics = async () => {
  const response = await adminApi.get('/admin/analytics');
  return response.data;
};

export const getReports = async (type = 'Sales', period = 'Monthly') => {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (period) params.append('period', period);
  const response = await adminApi.get(`/admin/reports?${params.toString()}`);
  return response.data;
};

export const getNotifications = async () => {
  const response = await adminApi.get('/admin/notifications');
  return response.data;
};

export const getAuditLogs = async () => {
  const response = await adminApi.get('/admin/audit');
  return response.data;
};

export const getUsers = async () => {
  const response = await adminApi.get('/admin/users');
  return response.data.users;
};

export const getItems = async () => {
  const response = await adminApi.get('/admin/items');
  return response.data.items;
};

export const getItem = async (itemId) => {
  const response = await adminApi.get(`/items/${itemId}`);
  return response.data.item;
};

export const updateUserStatus = async (userId, status) => {
  const response = await adminApi.patch(`/admin/users/${userId}/status`, { status });
  return response.data;
};

export const createAdminAccount = async (payload) => {
  const response = await adminApi.post('/admin/users/create-admin', payload);
  return response.data.user;
};

export const updateItemStatus = async (itemId, status, rejectionReason) => {
  const response = await adminApi.patch(`/admin/items/${itemId}/status`, { status, rejectionReason });
  return response.data;
};

export const updateItemNote = async (itemId, note) => {
  const response = await adminApi.patch(`/admin/items/${itemId}/note`, { note });
  return response.data;
};

export const getPayments = async () => {
  const response = await adminApi.get('/admin/payments');
  return response.data.payments;
};

export const getCategories = async () => {
  const response = await adminApi.get('/admin/categories');
  return response.data.categories;
};

export const createCategory = async (category) => {
  const response = await adminApi.post('/admin/categories', category);
  return response.data.category;
};

export const updateCategory = async (categoryId, category) => {
  const response = await adminApi.patch(`/admin/categories/${categoryId}`, category);
  return response.data.category;
};

export const deleteCategory = async (categoryId) => {
  const response = await adminApi.delete(`/admin/categories/${categoryId}`);
  return response.data;
};

// Professional Admin Charging System API Integration
export const getChargingRules = async () => {
  const response = await adminApi.get('/charging/rules');
  return response.data.rules;
};

export const createChargingRule = async (rule) => {
  const response = await adminApi.post('/charging/rules', rule);
  return response.data.rule;
};

export const updateChargingRule = async (id, rule) => {
  const response = await adminApi.patch(`/charging/rules/${id}`, rule);
  return response.data.rule;
};

export const deleteChargingRule = async (id) => {
  const response = await adminApi.delete(`/charging/rules/${id}`);
  return response.data;
};

export const toggleChargingRule = async (id) => {
  const response = await adminApi.patch(`/charging/rules/${id}/toggle`);
  return response.data.rule;
};

export const getChargingPayments = async () => {
  const response = await adminApi.get('/charging/payments');
  return response.data.payments;
};

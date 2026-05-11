import api from './axios';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getOne: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  resetPassword: (id, data) => api.put(`/users/${id}/reset-password`, data),
};

// ─── Leads ────────────────────────────────────────────────────────────────────
export const leadsAPI = {
  getAll: (params) => api.get('/leads', { params }),
  getOne: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  assign: (id, data) => api.put(`/leads/${id}/assign`, data),
  delete: (id) => api.delete(`/leads/${id}`),
  import: (formData) => api.post('/leads/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// ─── Follow-ups ───────────────────────────────────────────────────────────────
export const followupsAPI = {
  getTypes: () => api.get('/followups/types'),
  createType: (data) => api.post('/followups/types', data),
  updateType: (id, data) => api.put(`/followups/types/${id}`, data),
  deleteType: (id) => api.delete(`/followups/types/${id}`),

  getAll: (params) => api.get('/followups', { params }),
  create: (data) => api.post('/followups', data),
  getSummary: (params) => api.get('/followups/summary', { params }),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getChart: () => api.get('/dashboard/chart'),
  getActivity: () => api.get('/dashboard/activity'),
};

// ─── Plans ────────────────────────────────────────────────────────────────────
export const plansAPI = {
  getAll:  ()         => api.get('/plans'),
  create:  (data)     => api.post('/plans', data),
  update:  (id, data) => api.put(`/plans/${id}`, data),
  delete:  (id)       => api.delete(`/plans/${id}`),
};

// ─── Organizations (Superadmin) ───────────────────────────────────────────────
export const orgsAPI = {
  getAll:       (params) => api.get('/organizations', { params }),
  getOne:       (id)     => api.get(`/organizations/${id}`),
  getStats:     ()       => api.get('/organizations/stats'),
  create:       (data)   => api.post('/organizations', data),
  update:       (id, d)  => api.put(`/organizations/${id}`, d),
  updateStatus: (id, d)  => api.put(`/organizations/${id}/status`, d),
  delete:       (id)     => api.delete(`/organizations/${id}`),
};

// ─── Roles ────────────────────────────────────────────────────────────────────
export const rolesAPI = {
  getAll:  ()        => api.get('/roles'),
  create:  (data)    => api.post('/roles', data),
  update:  (id, data)=> api.put(`/roles/${id}`, data),
  delete:  (id)      => api.delete(`/roles/${id}`),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll:      (params) => api.get('/notifications', { params }),
  markRead:    (id)     => api.put(`/notifications/${id}/read`),
  markAllRead: ()       => api.put('/notifications/read-all'),
  delete:      (id)     => api.delete(`/notifications/${id}`),
  clearAll:    ()       => api.delete('/notifications/clear-all'),
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const profileAPI = {
  get:            ()     => api.get('/profile'),
  update:         (data) => api.put('/profile', data),
  changePassword: (data) => api.put('/profile/change-password', data),
};

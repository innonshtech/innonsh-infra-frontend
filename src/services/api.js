import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 & auto-refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Auth Service ─────────────────────────────────────────────────────────
export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// ─── Superadmin Service ───────────────────────────────────────────────────
export const superadminService = {
  getCompanies: () => api.get('/superadmin/companies'),
  approveCompany: (id) => api.patch(`/superadmin/companies/${id}/approve`),
  rejectCompany: (id) => api.patch(`/superadmin/companies/${id}/reject`),
  updateStatus: (id, status) => api.patch(`/superadmin/companies/${id}/status`, { status }),
};

// ─── Project Service ──────────────────────────────────────────────────────
export const projectService = {
  // Contractor
  getAll: () => api.get('/contractor/projects'),
  getById: (id) => api.get(`/contractor/projects/${id}`),
  create: (data) => api.post('/contractor/projects', data),
  update: (id, data) => api.patch(`/contractor/projects/${id}`, data),
  delete: (id) => api.delete(`/contractor/projects/${id}`),
  getDashboard: () => api.get('/contractor/projects/dashboard'),
  addMember: (id, data) => api.post(`/contractor/projects/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/contractor/projects/${id}/members/${userId}`),
  updateProgress: (id, data) => api.post(`/contractor/projects/${id}/progress`, data),
  getProgress: (id) => api.get(`/contractor/projects/${id}/progress`),
  getFinancials: (id) => api.get(`/contractor/projects/${id}/financials`),
  getTasks: (id) => api.get(`/contractor/projects/${id}/tasks`),
  createTask: (id, data) => api.post(`/contractor/projects/${id}/tasks`, data),
  updateTask: (taskId, data) => api.patch(`/contractor/projects/tasks/${taskId}`, data),
  deleteTask: (taskId) => api.delete(`/contractor/projects/tasks/${taskId}`),
  // Builder
  builderGetAll: () => api.get('/builder/projects'),
  builderGetById: (id) => api.get(`/builder/projects/${id}`),
  builderCreate: (data) => api.post('/builder/projects', data),
  builderUpdate: (id, data) => api.patch(`/builder/projects/${id}`, data),
  builderDelete: (id) => api.delete(`/builder/projects/${id}`),
  builderDashboard: (id) => api.get(`/builder/projects/${id}/dashboard`),
  builderGetUnits: (id) => api.get(`/builder/projects/${id}/units`),
  builderGetBookings: (id) => api.get(`/builder/projects/${id}/bookings`),
  builderGetLeads: (projectId) => api.get(`/builder/projects/leads?projectId=${projectId}`),
  builderCreateLead: (data) => api.post('/builder/projects/leads', data),
  // Builder Isolated Construction
  builderGetTasks: (id) => api.get(`/builder/projects/${id}/tasks`),
  builderCreateTask: (id, data) => api.post(`/builder/projects/${id}/tasks`, data),
  builderUpdateTask: (taskId, data) => api.patch(`/builder/projects/tasks/${taskId}`, data),
  builderDeleteTask: (taskId) => api.delete(`/builder/projects/tasks/${taskId}`),
};

// ─── Estimation Service ───────────────────────────────────────────────────
export const estimationService = {
  getAll: () => api.get('/contractor/estimations'),
  getById: (id) => api.get(`/contractor/estimations/${id}`),
  create: (data) => api.post('/contractor/estimations', data),
  update: (id, data) => api.patch(`/contractor/estimations/${id}`, data),
  delete: (id) => api.delete(`/contractor/estimations/${id}`),
  createVersion: (id, data) => api.post(`/contractor/estimations/${id}/versions`, data),
  getVersions: (id) => api.get(`/contractor/estimations/${id}/versions`),
  addItem: (versionId, data) => api.post(`/contractor/estimations/${versionId}/items`, data),
  updateItem: (estimationId, itemId, data) => api.patch(`/contractor/estimations/${estimationId}/items/${itemId}`, data),
  deleteItem: (estimationId, itemId) => api.delete(`/contractor/estimations/${estimationId}/items/${itemId}`),
  requestApproval: (id, data) => api.post(`/contractor/estimations/${id}/request-approval`, data),
  approve: (id) => api.post(`/contractor/estimations/${id}/approve`),
  createNextVersion: (id) => api.post(`/contractor/estimations/${id}/new-version`),
  pushToProcurement: (id, versionId) => api.post(`/contractor/estimations/${id}/push-to-procurement`, { versionId }),
  checkInventory: (id, versionId) => api.get(`/contractor/estimations/${id}/check-inventory?versionId=${versionId}`),
};

// ─── Procurement Service ──────────────────────────────────────────────────
export const procurementService = {
  // Requests
  getRequests: () => api.get('/contractor/procurement/requests'),
  getRequestById: (id) => api.get(`/contractor/procurement/requests/${id}`),
  createRequest: (data) => api.post('/contractor/procurement/requests', data),
  approveRequest: (id) => api.post(`/contractor/procurement/requests/${id}/approve`),
  rejectRequest: (id) => api.post(`/contractor/procurement/requests/${id}/reject`),
  // POs
  getPOs: () => api.get('/contractor/procurement/purchase-orders'),
  getPOById: (id) => api.get(`/contractor/procurement/purchase-orders/${id}`),
  createPO: (data) => api.post('/contractor/procurement/purchase-orders', data),
  updatePOStatus: (id, data) => api.patch(`/contractor/procurement/purchase-orders/${id}/status`, data),
  receivePO: (id, warehouseId) => api.post(`/contractor/procurement/purchase-orders/${id}/receive`, { warehouseId }),
  // Vendors
  getVendors: () => api.get('/contractor/procurement/vendors'),
  createVendor: (data) => api.post('/contractor/procurement/vendors', data),
  updateVendor: (id, data) => api.patch(`/contractor/procurement/vendors/${id}`, data),
  deleteVendor: (id) => api.delete(`/contractor/procurement/vendors/${id}`),
};

// ─── Inventory Service ────────────────────────────────────────────────────
export const inventoryService = {
  getItems: () => api.get('/contractor/inventory/items'),
  createItem: (data) => api.post('/contractor/inventory/items', data),
  updateItem: (id, data) => api.patch(`/contractor/inventory/items/${id}`, data),
  deleteItem: (id) => api.delete(`/contractor/inventory/items/${id}`),
  getStock: () => api.get('/contractor/inventory/stock'),
  processMovement: (data) => api.post('/contractor/inventory/stock/movement', data),
  getMovements: () => api.get('/contractor/inventory/stock/movements'),
  getWarehouses: () => api.get('/contractor/inventory/warehouses'),
  createWarehouse: (data) => api.post('/contractor/inventory/warehouses', data),
};

// ─── Finance Service ──────────────────────────────────────────────────────
export const financeService = {
  getTransactions: () => api.get('/contractor/finance/transactions'),
  createTransaction: (data) => api.post('/contractor/finance/transactions', data),
  getInvoices: () => api.get('/contractor/finance/invoices'),
  createInvoice: (data) => api.post('/contractor/finance/invoices', data),
  updateInvoice: (id, data) => api.patch(`/contractor/finance/invoices/${id}`, data),
  deleteInvoice: (id) => api.delete(`/contractor/finance/invoices/${id}`),
  getPayments: () => api.get('/contractor/finance/payments'),
  recordPayment: (data) => api.post('/contractor/finance/payments', data),
  getReportsSummary: () => api.get('/contractor/finance/reports/summary'),
};

// ─── Builder Services ─────────────────────────────────────────────────────
export const unitService = {
  getAll: () => api.get('/builder/units'),
  getById: (id) => api.get(`/builder/units/${id}`),
  create: (data) => api.post('/builder/units', data),
  update: (id, data) => api.patch(`/builder/units/${id}`, data),
  updateStatus: (id, data) => api.post(`/builder/units/${id}/status`, data),
  delete: (id) => api.delete(`/builder/units/${id}`),
};

export const bookingService = {
  getAll: () => api.get('/builder/bookings'),
  getById: (id) => api.get(`/builder/bookings/${id}`),
  create: (data) => api.post('/builder/bookings', data),
  update: (id, data) => api.patch(`/builder/bookings/${id}`, data),
  delete: (id) => api.delete(`/builder/bookings/${id}`),
  cancel: (id) => api.post(`/builder/bookings/${id}/cancel`),
  confirm: (id) => api.post(`/builder/bookings/${id}/confirm`),
  getPaymentPlan: (id) => api.get(`/builder/bookings/${id}/payment-plan`),
  savePaymentPlan: (id, data) => api.post(`/builder/bookings/${id}/payment-plan`, data),
};

export const billingService = {
  getInvoices: () => api.get('/builder/billing/invoices'),
  getInvoiceById: (id) => api.get(`/builder/billing/invoices/${id}`),
  createInvoice: (data) => api.post('/builder/billing/invoices', data),
  updateInvoice: (id, data) => api.patch(`/builder/billing/invoices/${id}`, data),
  deleteInvoice: (id) => api.delete(`/builder/billing/invoices/${id}`),
  recordPayment: (data) => api.post('/builder/billing/payments', data),
  getPayments: () => api.get('/builder/billing/payments'),
  getDues: () => api.get('/builder/billing/dues'),
  getReports: () => api.get('/builder/billing/reports'),
};

export const brokerService = {
  getAll: () => api.get('/builder/crm/brokers'),
  getById: (id) => api.get(`/builder/crm/brokers/${id}`),
  create: (data) => api.post('/builder/crm/brokers', data),
  update: (id, data) => api.patch(`/builder/crm/brokers/${id}`, data),
  delete: (id) => api.delete(`/builder/crm/brokers/${id}`),
};

export const leaseService = {
  getTenants: () => api.get('/builder/lease/tenants'),
  getTenantById: (id) => api.get(`/builder/lease/tenants/${id}`),
  createTenant: (data) => api.post('/builder/lease/tenants', data),
  updateTenant: (id, data) => api.patch(`/builder/lease/tenants/${id}`, data),
  deleteTenant: (id) => api.delete(`/builder/lease/tenants/${id}`),
  getAgreements: () => api.get('/builder/lease/agreements'),
  createAgreement: (data) => api.post('/builder/lease/agreements', data),
  updateAgreement: (id, data) => api.patch(`/builder/lease/agreements/${id}`, data),
  getRentCollections: () => api.get('/builder/lease/rent-collection'),
  collectRent: (data) => api.post('/builder/lease/rent-collection', data),
};

export const legalService = {
  getDocuments: () => api.get('/builder/legal/documents'),
  getDocumentById: (id) => api.get(`/builder/legal/documents/${id}`),
  createDocument: (data) => api.post('/builder/legal/documents', data),
  updateDocument: (id, data) => api.patch(`/builder/legal/documents/${id}`, data),
  deleteDocument: (id) => api.delete(`/builder/legal/documents/${id}`),
  getApprovals: () => api.get('/builder/legal/approvals'),
  recordApproval: (data) => api.post('/builder/legal/approvals', data),
  getCompliance: () => api.get('/builder/legal/compliance'),
  recordCompliance: (data) => api.post('/builder/legal/compliance', data),
};

export const reportService = {
  getDashboard: () => api.get('/builder/dashboard'),
  getSalesReport: (params) => api.get('/builder/reports/sales', { params }),
  getRevenueReport: (params) => api.get('/builder/reports/revenue', { params }),
  getBookingsReport: () => api.get('/builder/reports/bookings'),
  getDuesReport: () => api.get('/builder/reports/dues'),
};

export const userService = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  updatePermissions: (id, permissions) => api.patch(`/users/${id}/permissions`, { permissions }),
  delete: (id) => api.delete(`/users/${id}`),
};

// ─── Labour Service (Contractor) ──────────────────────────────────────────
export const labourService = {
  // Workers
  getWorkers: (params) => api.get('/contractor/labour/workers', { params }),
  getWorkerStats: () => api.get('/contractor/labour/workers/stats'),
  getWorkerById: (id) => api.get(`/contractor/labour/workers/${id}`),
  createWorker: (data) => api.post('/contractor/labour/workers', data),
  updateWorker: (id, data) => api.put(`/contractor/labour/workers/${id}`, data),
  deleteWorker: (id) => api.delete(`/contractor/labour/workers/${id}`),
  // Attendance
  getAttendance: (params) => api.get('/contractor/labour/attendance', { params }),
  getAttendanceSummary: (params) => api.get('/contractor/labour/attendance/summary', { params }),
  saveAttendance: (records) => api.post('/contractor/labour/attendance', { records }),
  // Excel Upload
  getAttendanceTemplate: (projectId) => api.get(`/contractor/labour/attendance/template/${projectId}`),
  uploadAttendance: (data) => api.post('/contractor/labour/attendance/upload', data),
  getUploadHistory: () => api.get('/contractor/labour/attendance/uploads'),
  // Payroll
  getPayroll: (params) => api.get('/contractor/labour/payroll', { params }),
  finalizePayroll: (data) => api.post('/contractor/labour/payroll/finalize', data),
};

// ─── Equipment Service (Contractor) ───────────────────────────────────────
export const equipmentService = {
  getAll: (params) => api.get('/contractor/equipment', { params }),
  getStats: () => api.get('/contractor/equipment/stats'),
  getById: (id) => api.get(`/contractor/equipment/${id}`),
  create: (data) => api.post('/contractor/equipment', { ...data }),
  update: (id, data) => api.put(`/contractor/equipment/${id}`, data),
  delete: (id) => api.delete(`/contractor/equipment/${id}`),
  addMaintenance: (id, data) => api.post(`/contractor/equipment/${id}/maintenance`, data),
  // Deployments
  getDeployments: (params) => api.get('/contractor/equipment/deployments/all', { params }),
  deployToProject: (id, data) => api.post(`/contractor/equipment/${id}/deploy`, data),
  endDeployment: (depId) => api.post(`/contractor/equipment/deployments/${depId}/end`),
  // Fuel Logs
  getFuelLogs: (params) => api.get('/contractor/equipment/fuel/all', { params }),
  addFuelLog: (id, data) => api.post(`/contractor/equipment/${id}/fuel`, data),
  // Depreciation
  getDepreciation: () => api.get('/contractor/equipment/depreciation/report'),
};

// ─── Contract Service (Contractor) ────────────────────────────────────────
export const contractService = {
  getAll: (params) => api.get('/contractor/contracts', { params }),
  getById: (id) => api.get(`/contractor/contracts/${id}`),
  create: (data) => api.post('/contractor/contracts', data),
  update: (id, data) => api.patch(`/contractor/contracts/${id}`, data),
  delete: (id) => api.delete(`/contractor/contracts/${id}`),
};

// ─── Notification Service ─────────────────────────────────────────────────
export const notificationService = {
  getAll: () => api.get('/contractor/notifications'),
  markRead: (id) => api.patch(`/contractor/notifications/${id}/read`),
  markAllRead: () => api.patch('/contractor/notifications/read-all'),
  generate: () => api.post('/contractor/notifications/generate'),
};

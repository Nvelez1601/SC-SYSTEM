const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // User Authentication
  login: (credentials) => ipcRenderer.invoke('user:login', credentials),
  logout: () => ipcRenderer.invoke('user:logout'),
  getCurrentUser: () => ipcRenderer.invoke('user:getCurrent'),
  
  // User Management (Super Admin & Admin)
  createUser: (userData) => ipcRenderer.invoke('user:create', userData),
  updateUser: (userId, userData) => ipcRenderer.invoke('user:update', userId, userData),
  deleteUser: (userId) => ipcRenderer.invoke('user:delete', userId),
  getAllUsers: (filters) => ipcRenderer.invoke('user:getAll', filters),
  getUserById: (userId) => ipcRenderer.invoke('user:getById', userId),
  
  // Project Management
  createProject: (projectData) => ipcRenderer.invoke('project:create', projectData),
  updateProject: (projectId, projectData) => ipcRenderer.invoke('project:update', projectId, projectData),
  deleteProject: (projectId) => ipcRenderer.invoke('project:delete', projectId),
  getAllProjects: (filters) => ipcRenderer.invoke('project:getAll', filters),
  getProjectById: (projectId) => ipcRenderer.invoke('project:getById', projectId),
  approveAnteproject: (projectId, approvedDate) => ipcRenderer.invoke('project:approveAnteproject', projectId, approvedDate),
  
  // Delivery Management
  submitDelivery: (deliveryData) => ipcRenderer.invoke('delivery:submit', deliveryData),
  reviewDelivery: (deliveryId, reviewerId, action, comments) => ipcRenderer.invoke('delivery:review', deliveryId, reviewerId, action, comments),
  getDeliveriesByProject: (projectId) => ipcRenderer.invoke('delivery:getByProject', projectId),
  getPendingDeliveries: () => ipcRenderer.invoke('delivery:getPending'),
  
  // Notifications
  sendEmail: (emailData) => ipcRenderer.invoke('email:send', emailData),
  
  // Reports
  generateReport: (reportType, filters) => ipcRenderer.invoke('report:generate', reportType, filters),
  // Import Excel
  importExcel: (filePath) => ipcRenderer.invoke('project:importExcel', filePath),
  importExonerados: (filePath) => ipcRenderer.invoke('exonerado:importExcel', filePath),
  // Import history
  getImportHistory: (type) => ipcRenderer.invoke('project:getImportHistory', type),
  clearImportHistory: (type) => ipcRenderer.invoke('project:clearImportHistory', type),
  // Exonerados
  getExonerados: () => ipcRenderer.invoke('exonerado:getAll'),
  createExonerado: (data) => ipcRenderer.invoke('exonerado:create', data),
  updateExonerado: (id, data) => ipcRenderer.invoke('exonerado:update', id, data),
  deleteExonerado: (id) => ipcRenderer.invoke('exonerado:delete', id),
});

// Expose a stable `dragEvent` binding in the renderer world for legacy bundles
try {
  contextBridge.exposeInMainWorld('dragEvent', null);
} catch (e) {
  // ignore if not possible
}

// Forward uncaught renderer errors to main process for easier debugging
try {
  // Ensure `dragEvent` exists globally to avoid ReferenceError from bundled code
  try {
    // define as undefined so references don't throw
    window.dragEvent = window.dragEvent === undefined ? undefined : window.dragEvent;
  } catch (e) {
    // ignore if unable to set
  }
  // This runs in the preload context and can capture global errors in renderer
  window.addEventListener('error', (evt) => {
    try {
      const payload = { message: evt.message, filename: evt.filename, lineno: evt.lineno, colno: evt.colno, error: (evt.error && evt.error.stack) || null };
      ipcRenderer.send('renderer:error', payload);
    } catch (e) {
      /* ignore */
    }
  });

  window.addEventListener('unhandledrejection', (evt) => {
    try {
      const reason = evt.reason && (evt.reason.stack || evt.reason.message) ? (evt.reason.stack || evt.reason.message) : String(evt.reason);
      ipcRenderer.send('renderer:error', { message: 'unhandledrejection', reason });
    } catch (e) {
      /* ignore */
    }
  });
} catch (e) {
  // preload may run in restricted contexts; fail silently
}

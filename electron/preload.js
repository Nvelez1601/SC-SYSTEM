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
  
  // Delivery Management
  submitDelivery: (deliveryData) => ipcRenderer.invoke('delivery:submit', deliveryData),
  reviewDelivery: (deliveryId, reviewerId, action, comments) => ipcRenderer.invoke('delivery:review', deliveryId, reviewerId, action, comments),
  getDeliveriesByProject: (projectId) => ipcRenderer.invoke('delivery:getByProject', projectId),
  getPendingDeliveries: () => ipcRenderer.invoke('delivery:getPending'),
  
  // Notifications
  sendEmail: (emailData) => ipcRenderer.invoke('email:send', emailData),
  
  // Reports
  generateReport: (reportType, filters) => ipcRenderer.invoke('report:generate', reportType, filters),
});

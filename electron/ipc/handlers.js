const UserController = require('../controllers/UserController');
const DeliveryController = require('../controllers/DeliveryController');
const EmailService = require('../core/services/EmailService');
const DatabaseConnection = require('../database/connection');
const ProjectRepository = require('../database/repositories/ProjectRepository');

let userController;
let emailService;

function setupIpcHandlers(ipcMain) {
  // Initialize controllers and services
  userController = new UserController();
  deliveryController = new DeliveryController();
  emailService = new EmailService();
  console.log('[IPC] setupIpcHandlers: controllers and services initialized');

  // User Authentication Handlers
  ipcMain.handle('user:login', async (event, credentials) => {
    console.log('[IPC] user:login called', { username: credentials && credentials.username });
    try {
      const res = await userController.login(credentials);
      console.log('[IPC] user:login result', { username: credentials && credentials.username, success: res && res.success });
      return res;
    } catch (err) {
      console.error('[IPC] user:login error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('user:logout', async () => {
    console.log('[IPC] user:logout called');
    try {
      const res = await userController.logout();
      console.log('[IPC] user:logout result', res);
      return res;
    } catch (err) {
      console.error('[IPC] user:logout error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('user:getCurrent', () => {
    try {
      console.log('[IPC] user:getCurrent called');
      const res = userController.getCurrentUser();
      console.log('[IPC] user:getCurrent result', { hasUser: !!(res && res.user) });
      return res;
    } catch (err) {
      console.error('[IPC] user:getCurrent error', err);
      return { success: false, error: err.message };
    }
  });

  // User Management Handlers
  ipcMain.handle('user:create', async (event, userData) => {
    console.log('[IPC] user:create called', { username: userData && userData.username, email: userData && userData.email });
    try {
      const result = await userController.createUser(userData);

      // Send welcome email if user creation was successful
      if (result.success && result.user) {
        try {
          await emailService.sendUserCreatedEmail(result.user);
        } catch (mailErr) {
          console.error('[IPC] sendUserCreatedEmail error', mailErr);
        }
      }

      console.log('[IPC] user:create result', { success: result && result.success, error: result && result.error });
      return result;
    } catch (err) {
      console.error('[IPC] user:create error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('user:update', async (event, userId, userData) => {
    console.log('[IPC] user:update called', { userId });
    try {
      const res = await userController.updateUser(userId, userData);
      console.log('[IPC] user:update result', res);
      return res;
    } catch (err) {
      console.error('[IPC] user:update error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('user:delete', async (event, userId) => {
    console.log('[IPC] user:delete called', { userId });
    try {
      const res = await userController.deleteUser(userId);
      console.log('[IPC] user:delete result', res);
      return res;
    } catch (err) {
      console.error('[IPC] user:delete error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('user:getAll', async (event, filters) => {
    console.log('[IPC] user:getAll called', { filters });
    try {
      const res = await userController.getAllUsers(filters);
      console.log('[IPC] user:getAll result count', res && res.users && res.users.length);
      return res;
    } catch (err) {
      console.error('[IPC] user:getAll error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('user:getById', async (event, userId) => {
    console.log('[IPC] user:getById called', { userId });
    try {
      const res = await userController.getUserById(userId);
      console.log('[IPC] user:getById result', res);
      return res;
    } catch (err) {
      console.error('[IPC] user:getById error', err);
      return { success: false, error: err.message };
    }
  });

  // Delivery Handlers
  ipcMain.handle('delivery:submit', async (event, deliveryData) => {
    console.log('[IPC] delivery:submit called', { projectId: deliveryData && deliveryData.projectId, deliveryNumber: deliveryData && deliveryData.deliveryNumber });
    try {
      const res = await deliveryController.submitDelivery(deliveryData);
      console.log('[IPC] delivery:submit result', { success: res && res.success, error: res && res.error });
      return res;
    } catch (err) {
      console.error('[IPC] delivery:submit error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delivery:review', async (event, deliveryId, reviewerId, action, comments) => {
    console.log('[IPC] delivery:review called', { deliveryId, reviewerId, action });
    try {
      const res = await deliveryController.reviewDelivery(deliveryId, reviewerId, action, comments);
      console.log('[IPC] delivery:review result', { success: res && res.success, error: res && res.error });
      return res;
    } catch (err) {
      console.error('[IPC] delivery:review error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delivery:getByProject', async (event, projectId) => {
    console.log('[IPC] delivery:getByProject called', { projectId });
    try {
      const res = await deliveryController.getByProject(projectId);
      console.log('[IPC] delivery:getByProject result', { count: res && res.deliveries && res.deliveries.length });
      return res;
    } catch (err) {
      console.error('[IPC] delivery:getByProject error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delivery:getPending', async () => {
    console.log('[IPC] delivery:getPending called');
    try {
      const res = await deliveryController.getPendingReviews();
      console.log('[IPC] delivery:getPending result', { count: res && res.deliveries && res.deliveries.length });
      return res;
    } catch (err) {
      console.error('[IPC] delivery:getPending error', err);
      return { success: false, error: err.message };
    }
  });

  // Email Handlers
  ipcMain.handle('email:send', async (event, emailData) => {
    console.log('[IPC] email:send called', { to: emailData && emailData.to, subject: emailData && emailData.subject });
    try {
      const res = await emailService.sendEmail(
        emailData.to,
        emailData.subject,
        emailData.text,
        emailData.html
      );
      console.log('[IPC] email:send result', res);
      return res;
    } catch (err) {
      console.error('[IPC] email:send error', err);
      return { success: false, error: err.message };
    }
  });

  // Project Handlers (basic create & list)
  ipcMain.handle('project:create', async (event, projectData) => {
    console.log('[IPC] project:create called', { projectCode: projectData && projectData.projectCode });
    try {
      const db = DatabaseConnection.getInstance();
      const projectRepo = new ProjectRepository(db.getDatabase('projects'));
      const toCreate = { ...projectData, progress: projectData.progress || 0 };
      const created = await projectRepo.create(toCreate);
      console.log('[IPC] project:create result', { id: created && created._id });
      return { success: true, project: created };
    } catch (err) {
      console.error('[IPC] project:create error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:getAll', async (event, filters) => {
    console.log('[IPC] project:getAll called', { filters });
    try {
      const db = DatabaseConnection.getInstance();
      const projectRepo = new ProjectRepository(db.getDatabase('projects'));
      const projects = await projectRepo.findAll(filters || {});
      console.log('[IPC] project:getAll result count', projects.length);
      return { success: true, projects };
    } catch (err) {
      console.error('[IPC] project:getAll error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:getById', async (event, projectId) => {
    console.log('[IPC] project:getById called', { projectId });
    try {
      const db = DatabaseConnection.getInstance();
      const projectRepo = new ProjectRepository(db.getDatabase('projects'));
      const project = await projectRepo.findById(projectId);
      console.log('[IPC] project:getById result', { found: !!project });
      return { success: true, project };
    } catch (err) {
      console.error('[IPC] project:getById error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:update', async (event, projectId, projectData) => {
    console.log('[IPC] project:update called', { projectId, projectData });
    try {
      const db = DatabaseConnection.getInstance();
      const projectRepo = new ProjectRepository(db.getDatabase('projects'));
      const updated = await projectRepo.update(projectId, projectData);
      console.log('[IPC] project:update result', { id: updated && updated._id });
      return { success: true, project: updated };
    } catch (err) {
      console.error('[IPC] project:update error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:delete', async (event, projectId) => {
    console.log('[IPC] project:delete called', { projectId });
    try {
      const db = DatabaseConnection.getInstance();
      const projectRepo = new ProjectRepository(db.getDatabase('projects'));
      const removed = await projectRepo.delete(projectId);
      console.log('[IPC] project:delete result', { removed });
      return { success: true, removed };
    } catch (err) {
      console.error('[IPC] project:delete error', err);
      return { success: false, error: err.message };
    }
  });

  console.log('IPC handlers registered successfully');
}

module.exports = setupIpcHandlers;

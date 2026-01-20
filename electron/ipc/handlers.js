const UserController = require('../controllers/UserController');
const DeliveryController = require('../controllers/DeliveryController');
const ProjectController = require('../controllers/ProjectController');
const EmailService = require('../core/services/EmailService');
const DatabaseConnection = require('../database/connection');
const importExcel = require('../scripts/importExcel');

let userController;
let deliveryController;
let projectController;
let emailService;

function setupIpcHandlers(ipcMain) {
  // Initialize controllers and services
  userController = new UserController();
  deliveryController = new DeliveryController();
  projectController = new ProjectController();
  emailService = new EmailService();
  console.log('[IPC] setupIpcHandlers: controllers and services initialized');

  const resolveCurrentUser = () => {
    try {
      const res = userController.getCurrentUser();
      return res && res.user ? res.user : null;
    } catch (err) {
      console.error('[IPC] resolveCurrentUser error', err);
      return null;
    }
  };

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
      const currentUser = resolveCurrentUser();
      const res = await projectController.createProject(projectData, currentUser);
      console.log('[IPC] project:create result', { id: res && res.project && res.project._id });
      return res;
    } catch (err) {
      console.error('[IPC] project:create error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:importExcel', async (event, filePath) => {
    console.log('[IPC] project:importExcel called', { filePath });
    try {
      const currentUser = resolveCurrentUser();
      const requestedBy = currentUser && (currentUser.firstName || currentUser.lastName)
        ? [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ').trim()
        : (currentUser && currentUser.username) || 'desconocido';
      const res = await importExcel(filePath, { requestedBy });
      console.log('[IPC] project:importExcel result', { createdProjects: res && res.results && res.results.createdProjects, createdDeliveries: res && res.results && res.results.createdDeliveries });
      return res;
    } catch (err) {
      console.error('[IPC] project:importExcel error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:getImportHistory', async () => {
    try {
      const db = DatabaseConnection.getInstance();
      const importsDb = db.getDatabase('imports');
      if (!importsDb) return { success: true, imports: [] };

      return new Promise((resolve) => {
        importsDb.find({}).sort({ importedAt: -1 }).exec((err, docs) => {
          if (err) resolve({ success: false, error: err.message });
          else resolve({ success: true, imports: docs || [] });
        });
      });
    } catch (err) {
      console.error('[IPC] project:getImportHistory error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:clearImportHistory', async () => {
    try {
      const db = DatabaseConnection.getInstance();
      const importsDb = db.getDatabase('imports');
      if (!importsDb) return { success: true };

      return new Promise((resolve, reject) => {
        importsDb.remove({}, { multi: true }, (err, numRemoved) => {
          if (err) resolve({ success: false, error: err.message });
          else resolve({ success: true, removed: numRemoved });
        });
      });
    } catch (err) {
      console.error('[IPC] project:clearImportHistory error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:getAll', async (event, filters = {}) => {
    const effectiveFilters = filters && typeof filters === 'object' ? { ...filters } : {};
    console.log('[IPC] project:getAll called', { filters: effectiveFilters });
    try {
      const currentUser = resolveCurrentUser();
      const res = await projectController.getAllProjects(effectiveFilters, currentUser);
      console.log('[IPC] project:getAll result count', res && res.projects && res.projects.length);
      return res;
    } catch (err) {
      console.error('[IPC] project:getAll error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:getById', async (event, projectId) => {
    console.log('[IPC] project:getById called', { projectId });
    try {
      const currentUser = resolveCurrentUser();
      const res = await projectController.getProjectById(projectId, currentUser);
      console.log('[IPC] project:getById result', { found: !!(res && res.project) });
      return res;
    } catch (err) {
      console.error('[IPC] project:getById error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:update', async (event, projectId, projectData) => {
    console.log('[IPC] project:update called', { projectId, projectData });
    try {
      const currentUser = resolveCurrentUser();
      const res = await projectController.updateProject(projectId, projectData, currentUser);
      console.log('[IPC] project:update result', { id: res && res.project && res.project._id });
      return res;
    } catch (err) {
      console.error('[IPC] project:update error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:delete', async (event, projectId) => {
    console.log('[IPC] project:delete called', { projectId });
    try {
      const currentUser = resolveCurrentUser();
      const res = await projectController.deleteProject(projectId, currentUser);
      console.log('[IPC] project:delete result', res);
      return res;
    } catch (err) {
      console.error('[IPC] project:delete error', err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('project:approveAnteproject', async (event, projectId, approvedDate) => {
    console.log('[IPC] project:approveAnteproject called', { projectId, approvedDate });
    try {
      const currentUser = resolveCurrentUser();
      const res = await projectController.approveAnteproject(projectId, approvedDate, currentUser);
      console.log('[IPC] project:approveAnteproject result', { id: res && res.project && res.project._id });
      return res;
    } catch (err) {
      console.error('[IPC] project:approveAnteproject error', err);
      return { success: false, error: err.message };
    }
  });

  console.log('IPC handlers registered successfully');
}

module.exports = setupIpcHandlers;

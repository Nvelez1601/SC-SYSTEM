const UserController = require('../controllers/UserController');
const EmailService = require('../core/services/EmailService');

let userController;
let emailService;

function setupIpcHandlers(ipcMain) {
  // Initialize controllers and services
  userController = new UserController();
  emailService = new EmailService();

  // User Authentication Handlers
  ipcMain.handle('user:login', async (event, credentials) => {
    return await userController.login(credentials);
  });

  ipcMain.handle('user:logout', async () => {
    return await userController.logout();
  });

  ipcMain.handle('user:getCurrent', () => {
    return userController.getCurrentUser();
  });

  // User Management Handlers
  ipcMain.handle('user:create', async (event, userData) => {
    const result = await userController.createUser(userData);
    
    // Send welcome email if user creation was successful
    if (result.success && result.user) {
      await emailService.sendUserCreatedEmail(result.user);
    }
    
    return result;
  });

  ipcMain.handle('user:update', async (event, userId, userData) => {
    return await userController.updateUser(userId, userData);
  });

  ipcMain.handle('user:delete', async (event, userId) => {
    return await userController.deleteUser(userId);
  });

  ipcMain.handle('user:getAll', async (event, filters) => {
    return await userController.getAllUsers(filters);
  });

  ipcMain.handle('user:getById', async (event, userId) => {
    return await userController.getUserById(userId);
  });

  // Email Handlers
  ipcMain.handle('email:send', async (event, emailData) => {
    return await emailService.sendEmail(
      emailData.to,
      emailData.subject,
      emailData.text,
      emailData.html
    );
  });

  console.log('IPC handlers registered successfully');
}

module.exports = setupIpcHandlers;

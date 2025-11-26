const LoginUserUseCase = require('../core/useCases/user/LoginUserUseCase');
const CreateUserUseCase = require('../core/useCases/user/CreateUserUseCase');
const GetAllUsersUseCase = require('../core/useCases/user/GetAllUsersUseCase');
const DatabaseConnection = require('../database/connection');
const UserRepository = require('../database/repositories/UserRepository');

class UserController {
  constructor() {
    const db = DatabaseConnection.getInstance();
    this.userRepository = new UserRepository(db.getDatabase('users'));
    this.currentUser = null;
    console.log('[UserController] initialized');
  }

  async login(credentials) {
    try {
      console.log('[UserController] login called for username:', credentials && credentials.username);
      const loginUseCase = new LoginUserUseCase();
      const result = await loginUseCase.execute(credentials.username, credentials.password);

      console.log('[UserController] login result for', credentials && credentials.username, result && (result.success ? 'SUCCESS' : `FAIL: ${result.error}`));

      if (result.success) {
        this.currentUser = result.user;
      }

      return result;
    } catch (error) {
      console.error('[UserController] login error for', credentials && credentials.username, error);
      return { success: false, error: error.message };
    }
  }

  async logout() {
    this.currentUser = null;
    return { success: true, message: 'Logged out successfully' };
  }

  getCurrentUser() {
    console.log('[UserController] getCurrentUser called, currentUser:', !!this.currentUser);
    return {
      success: true,
      user: this.currentUser,
    };
  }

  async createUser(userData) {
    if (!this.currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const createUserUseCase = new CreateUserUseCase();
    return await createUserUseCase.execute(userData, this.currentUser.role);
  }

  async getAllUsers(filters) {
    if (!this.currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    const getAllUsersUseCase = new GetAllUsersUseCase();
    return await getAllUsersUseCase.execute(filters);
  }

  async getUserById(userId) {
    if (!this.currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const user = await this.userRepository.findById(userId);
      
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const { password, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateUser(userId, userData) {
    if (!this.currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const updatedUser = await this.userRepository.update(userId, userData);

      if (!updatedUser) {
        return { success: false, error: 'User not found' };
      }

      const { password, ...userWithoutPassword } = updatedUser;

      return {
        success: true,
        user: userWithoutPassword,
        message: 'User updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteUser(userId) {
    if (!this.currentUser) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const numRemoved = await this.userRepository.delete(userId);

      if (numRemoved === 0) {
        return { success: false, error: 'User not found' };
      }

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = UserController;

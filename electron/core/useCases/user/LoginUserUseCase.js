const DatabaseConnection = require('../../database/connection');
const UserRepository = require('../../database/repositories/UserRepository');
const bcrypt = require('bcryptjs');

class LoginUserUseCase {
  constructor() {
    const db = DatabaseConnection.getInstance();
    this.userRepository = new UserRepository(db.getDatabase('users'));
  }

  async execute(username, password) {
    try {
      // Find user by username
      const user = await this.userRepository.findByUsername(username);

      if (!user) {
        throw new Error('Invalid username or password');
      }

      // Check if user is active
      if (!user.active) {
        throw new Error('User account is deactivated');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new Error('Invalid username or password');
      }

      // Update last login
      await this.userRepository.updateLastLogin(user._id);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;

      return {
        success: true,
        user: userWithoutPassword,
        message: 'Login successful',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = LoginUserUseCase;

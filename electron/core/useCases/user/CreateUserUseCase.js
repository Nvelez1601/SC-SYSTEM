const DatabaseConnection = require('../../database/connection');
const UserRepository = require('../../database/repositories/UserRepository');
const bcrypt = require('bcryptjs');
const config = require('../../config/database');

class CreateUserUseCase {
  constructor() {
    const db = DatabaseConnection.getInstance();
    this.userRepository = new UserRepository(db.getDatabase('users'));
  }

  async execute(userData, creatorRole) {
    try {
      // Validate creator permissions
      if (!this.canCreateUser(creatorRole, userData.role)) {
        throw new Error('Insufficient permissions to create this user type');
      }

      // Check if username already exists
      const existingUsername = await this.userRepository.findByUsername(userData.username);
      if (existingUsername) {
        throw new Error('Username already exists');
      }

      // Check if email already exists
      const existingEmail = await this.userRepository.findByEmail(userData.email);
      if (existingEmail) {
        throw new Error('Email already exists');
      }

      // Validate required fields
      if (!userData.username || !userData.password || !userData.email || !userData.role) {
        throw new Error('Missing required fields');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user object
      const newUser = {
        username: userData.username,
        password: hashedPassword,
        email: userData.email,
        role: userData.role,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        active: true,
      };

      // Insert user
      const createdUser = await this.userRepository.create(newUser);

      // Return user without password
      const { password: _, ...userWithoutPassword } = createdUser;

      return {
        success: true,
        user: userWithoutPassword,
        message: 'User created successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  canCreateUser(creatorRole, targetRole) {
    // Super Admin can create anyone
    if (creatorRole === config.roles.SUPER_ADMIN) {
      return true;
    }

    // Admin can create Reviewers and Students
    if (creatorRole === config.roles.ADMIN) {
      return targetRole === config.roles.REVIEWER || targetRole === config.roles.STUDENT;
    }

    return false;
  }
}

module.exports = CreateUserUseCase;

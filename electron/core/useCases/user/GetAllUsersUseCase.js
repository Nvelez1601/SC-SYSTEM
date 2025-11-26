const DatabaseConnection = require('../../database/connection');
const UserRepository = require('../../database/repositories/UserRepository');

class GetAllUsersUseCase {
  constructor() {
    const db = DatabaseConnection.getInstance();
    this.userRepository = new UserRepository(db.getDatabase('users'));
  }

  async execute(filters = {}) {
    try {
      let query = {};

      // Apply filters
      if (filters.role) {
        query.role = filters.role;
      }

      if (filters.active !== undefined) {
        query.active = filters.active;
      }

      // Get users
      const users = await this.userRepository.findAll(query);

      // Remove passwords from results
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      return {
        success: true,
        users: usersWithoutPasswords,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = GetAllUsersUseCase;

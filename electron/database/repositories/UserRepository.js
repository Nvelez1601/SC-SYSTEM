const BaseRepository = require('./BaseRepository');

class UserRepository extends BaseRepository {
  constructor(db) {
    super(db);
  }

  async findByUsername(username) {
    return this.findOne({ username });
  }

  async findByEmail(email) {
    return this.findOne({ email });
  }

  async findByRole(role) {
    return this.findAll({ role });
  }

  async findActiveUsers() {
    return this.findAll({ active: true });
  }

  async updateLastLogin(userId) {
    return new Promise((resolve, reject) => {
      this.db.update(
        { _id: userId },
        { $set: { lastLogin: new Date(), updatedAt: new Date() } },
        { returnUpdatedDocs: true },
        (err, numAffected, affectedDocuments) => {
          if (err) reject(err);
          else resolve(affectedDocuments);
        }
      );
    });
  }

  async deactivateUser(userId) {
    return this.update(userId, { active: false });
  }

  async activateUser(userId) {
    return this.update(userId, { active: true });
  }
}

module.exports = UserRepository;

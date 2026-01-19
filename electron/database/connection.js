const Datastore = require('nedb');
const path = require('path');
const fs = require('fs');
const config = require('../config/database');
const bcrypt = require('bcryptjs');

class DatabaseConnection {
  constructor() {
    if (DatabaseConnection.instance) {
      return DatabaseConnection.instance;
    }
    
    this.db = {};
    DatabaseConnection.instance = this;
  }

  static getInstance() {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async initialize() {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(config.database.path)) {
        fs.mkdirSync(config.database.path, { recursive: true });
      }

      // Initialize all databases
      this.db.users = new Datastore({
        filename: path.join(config.database.path, config.database.users),
        autoload: true,
      });

      this.db.projects = new Datastore({
        filename: path.join(config.database.path, config.database.projects),
        autoload: true,
      });

      this.db.deliveries = new Datastore({
        filename: path.join(config.database.path, config.database.deliveries),
        autoload: true,
      });

      this.db.notifications = new Datastore({
        filename: path.join(config.database.path, config.database.notifications),
        autoload: true,
      });

      this.db.imports = new Datastore({
        filename: path.join(config.database.path, config.database.imports),
        autoload: true,
      });

      // Create indexes
      this.db.users.ensureIndex({ fieldName: 'username', unique: true });
      this.db.users.ensureIndex({ fieldName: 'email', unique: true });
      this.db.projects.ensureIndex({ fieldName: 'projectCode', unique: true });

      console.log('Database initialized successfully');

      // Seed Super Admin user if not exists
      await this.seedSuperAdmin();

      return this.db;
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async seedSuperAdmin() {
    return new Promise((resolve, reject) => {
      this.db.users.findOne({ role: 'super_admin' }, async (err, existingAdmin) => {
        if (err) {
          reject(err);
          return;
        }

        if (!existingAdmin) {
          const hashedPassword = await bcrypt.hash('eerVCWETxoJvRiMqiyf4', 10);
          
          const superAdmin = {
            username: 'admin',
            password: hashedPassword,
            email: 'admin@usm.edu',
            role: 'super_admin',
            firstName: 'Super',
            lastName: 'Administrator',
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          this.db.users.insert(superAdmin, (err, newDoc) => {
            if (err) {
              reject(err);
            } else {
              console.log('Super Admin user created successfully');
              resolve(newDoc);
            }
          });
        } else {
          console.log('Super Admin user already exists');
          resolve(existingAdmin);
        }
      });
    });
  }

  getDatabase(name) {
    return this.db[name];
  }

  close() {
    // NeDB doesn't require explicit closing
    console.log('Database connections closed');
  }
}

module.exports = DatabaseConnection;

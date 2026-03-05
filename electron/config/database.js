const path = require('path');

// Prefer an explicit environment override, otherwise use Electron's userData when available,
// falling back to the repository `data/` folder. This makes the app portable and keeps
// per-user data when installed.
let defaultDataPath = path.join(__dirname, '../../data');
try {
  const { app } = require('electron');
  if (app && app.getPath) {
    defaultDataPath = app.getPath('userData');
  }
} catch (e) {
  // Not running inside Electron main process (e.g., during static analysis or tests)
}

const config = {
  database: {
    path: process.env.USM_DATA_PATH || defaultDataPath,
    users: 'users.db',
    projects: 'projects.db',
    deliveries: 'deliveries.db',
    notifications: 'notifications.db',
    imports: 'imports.db',
    exonerados: 'exonerados.db',
  },
  
  app: {
    name: 'USM Community Service Tracker',
    version: '1.0.0',
  },
  
  roles: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    REVIEWER: 'reviewer',
    STUDENT: 'student',
  },
  
  deliveryStatus: {
    PENDING: 'pending',
    IN_REVIEW: 'in_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },
  
  projectStatus: {
    DRAFT: 'draft',
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    EXPIRED: 'expired',
  },
  
  projectDuration: {
    MONTHS: 3, // 3 months default duration
  },

  projectTimeline: {
    TOTAL_DELIVERIES: 2,
    FIRST_DELIVERY_MONTHS: 1,
    FINAL_DELIVERY_MONTHS: 3,
    MAX_MONTHS: 12,
    MONTHLY_INTERVAL_DAYS: 30,
  },
};

module.exports = config;

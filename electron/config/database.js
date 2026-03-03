const path = require('path');

const config = {
  database: {
    path: path.join(__dirname, '../../data'),
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

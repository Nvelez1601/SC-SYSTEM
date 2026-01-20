const { addMonths } = require('date-fns');
const config = require('../../config/database');

class ProjectTimelineService {
  constructor(options = {}) {
    this.totalDeliveries = options.totalDeliveries || config.projectTimeline.TOTAL_DELIVERIES;
    this.maxMonths = options.maxMonths || config.projectTimeline.MAX_MONTHS;
  }

  buildInitialFields(payload = {}) {
    const now = new Date();
    const anteprojectApprovedAt = payload.anteprojectApprovedAt || null;
    return {
      status: anteprojectApprovedAt ? config.projectStatus.ACTIVE : config.projectStatus.DRAFT,
      statusDetail: anteprojectApprovedAt ? 'anteproject_approved' : 'pending_anteproject',
      anteprojectApprovedAt,
      expiresAt: anteprojectApprovedAt ? this.calculateExpiration(anteprojectApprovedAt) : null,
      nextDueDate: anteprojectApprovedAt ? this.computeNextDueDate(anteprojectApprovedAt) : null,
      lastDeliveryApprovedAt: null,
      deliveriesCompleted: 0,
      currentDeliveryNumber: anteprojectApprovedAt ? 1 : null,
      totalDeliveries: this.totalDeliveries,
      createdAt: payload.createdAt || now,
      updatedAt: payload.updatedAt || now,
    };
  }

  calculateExpiration(anteprojectDate) {
    if (!anteprojectDate) return null;
    return addMonths(new Date(anteprojectDate), this.maxMonths);
  }

  computeNextDueDate(baseDate) {
    if (!baseDate) return null;
    return addMonths(new Date(baseDate), 1);
  }

  ensureAnteproject(project) {
    if (!project || !project.anteprojectApprovedAt) {
      throw new Error('Anteproject approval is required before scheduling deliveries');
    }
  }

  getExpectedDeliveryNumber(project, deliveries = []) {
    if (!project) return 1;
    if (typeof project.currentDeliveryNumber === 'number' && project.currentDeliveryNumber >= 1) {
      return project.currentDeliveryNumber;
    }

    const approvedDeliveries = deliveries.filter((d) => d.status === config.deliveryStatus.APPROVED);
    const completed = approvedDeliveries.length;
    if (completed >= this.totalDeliveries) {
      return null;
    }
    return completed + 1;
  }

  applyAnteprojectApproval(project, approvedDate) {
    const anteDate = new Date(approvedDate || Date.now());
    return {
      anteprojectApprovedAt: anteDate,
      expiresAt: this.calculateExpiration(anteDate),
      nextDueDate: this.computeNextDueDate(anteDate),
      status: config.projectStatus.ACTIVE,
      statusDetail: 'anteproject_approved',
      currentDeliveryNumber: 1,
    };
  }

  applyApprovalUpdate(project, deliveryNumber, approvalDate = new Date()) {
    const approvedCount = Math.max(deliveryNumber, project.deliveriesCompleted || 0);
    const completedAll = approvedCount >= this.totalDeliveries;
    return {
      deliveriesCompleted: approvedCount,
      lastDeliveryApprovedAt: approvalDate,
      nextDueDate: completedAll ? null : this.computeNextDueDate(approvalDate),
      status: completedAll ? config.projectStatus.COMPLETED : config.projectStatus.ACTIVE,
      statusDetail: completedAll ? 'all_deliveries_completed' : `delivery_${deliveryNumber}_approved`,
      currentDeliveryNumber: completedAll ? null : deliveryNumber + 1,
    };
  }

  applyRejectionUpdate(project, deliveryNumber, rejectionDate = new Date()) {
    return {
      status: config.projectStatus.ACTIVE,
      statusDetail: `delivery_${deliveryNumber}_rejected`,
      nextDueDate: this.computeNextDueDate(rejectionDate),
      currentDeliveryNumber: deliveryNumber,
    };
  }

  detectExpiration(project, now = new Date()) {
    if (!project || !project.expiresAt) {
      return {};
    }

    if (now > new Date(project.expiresAt)) {
      const hasCompleted = (project.deliveriesCompleted || 0) >= this.totalDeliveries;
      if (!hasCompleted) {
        return {
          status: config.projectStatus.EXPIRED,
          statusDetail: 'project_expired',
        };
      }
    }

    return {};
  }
}

module.exports = ProjectTimelineService;

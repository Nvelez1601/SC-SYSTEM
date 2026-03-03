const { addMonths } = require('date-fns');
const config = require('../../config/database');

class ProjectTimelineService {
  constructor(options = {}) {
    this.totalDeliveries = options.totalDeliveries || config.projectTimeline.TOTAL_DELIVERIES;
    this.maxMonths = options.maxMonths || config.projectTimeline.MAX_MONTHS;
    this.firstDeliveryMonths = options.firstDeliveryMonths || config.projectTimeline.FIRST_DELIVERY_MONTHS || 1;
    this.finalDeliveryMonths = options.finalDeliveryMonths || config.projectTimeline.FINAL_DELIVERY_MONTHS || 3;
  }

  buildInitialFields(payload = {}) {
    const now = new Date();
    const anteprojectApprovedAt = payload.anteprojectApprovedAt || null;
    return {
      status: anteprojectApprovedAt ? config.projectStatus.ACTIVE : config.projectStatus.DRAFT,
      statusDetail: anteprojectApprovedAt ? 'anteproject_approved' : 'pending_anteproject',
      anteprojectApprovedAt,
      expiresAt: anteprojectApprovedAt ? this.calculateExpiration(anteprojectApprovedAt) : null,
      nextDueDate: anteprojectApprovedAt ? this.computeNextDueDate(anteprojectApprovedAt, 1) : null,
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

  computeNextDueDate(baseDate, nextDeliveryNumber = 1) {
    if (!baseDate) return null;
    const months = nextDeliveryNumber >= this.totalDeliveries ? this.finalDeliveryMonths : this.firstDeliveryMonths;
    return addMonths(new Date(baseDate), months);
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
    const approvedWithinRange = approvedDeliveries.filter((d) => d.deliveryNumber <= this.totalDeliveries);
    const hasLegacyFinal = approvedDeliveries.some((d) => d.deliveryNumber > this.totalDeliveries);
    const completed = hasLegacyFinal ? this.totalDeliveries : approvedWithinRange.length;
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
      nextDueDate: this.computeNextDueDate(anteDate, 1),
      status: config.projectStatus.ACTIVE,
      statusDetail: 'anteproject_approved',
      currentDeliveryNumber: 1,
    };
  }

  applyApprovalUpdate(project, deliveryNumber, approvalDate = new Date()) {
    const approvedCount = Math.min(
      Math.max(deliveryNumber, project.deliveriesCompleted || 0),
      this.totalDeliveries
    );
    const completedAll = approvedCount >= this.totalDeliveries;
    const nextDeliveryNumber = completedAll ? null : deliveryNumber + 1;
    return {
      deliveriesCompleted: approvedCount,
      lastDeliveryApprovedAt: approvalDate,
      nextDueDate: completedAll ? null : this.computeNextDueDate(approvalDate, nextDeliveryNumber),
      status: completedAll ? config.projectStatus.COMPLETED : config.projectStatus.ACTIVE,
      statusDetail: completedAll ? 'all_deliveries_completed' : `delivery_${deliveryNumber}_approved`,
      currentDeliveryNumber: nextDeliveryNumber,
    };
  }

  applyRejectionUpdate(project, deliveryNumber, rejectionDate = new Date()) {
    return {
      status: config.projectStatus.ACTIVE,
      statusDetail: `delivery_${deliveryNumber}_rejected`,
      nextDueDate: this.computeNextDueDate(rejectionDate, deliveryNumber),
      currentDeliveryNumber: deliveryNumber,
    };
  }

  normalizeProjectProgress(project, deliveries = []) {
    if (!project) return {};
    const updates = {};
    if (project.totalDeliveries !== this.totalDeliveries) {
      updates.totalDeliveries = this.totalDeliveries;
    }

    const approvedDeliveries = deliveries.filter((d) => d.status === config.deliveryStatus.APPROVED);
    const approvedWithinRange = approvedDeliveries.filter((d) => d.deliveryNumber <= this.totalDeliveries).length;
    const hasLegacyFinal = approvedDeliveries.some((d) => d.deliveryNumber > this.totalDeliveries);
    const normalizedCompleted = hasLegacyFinal
      ? this.totalDeliveries
      : Math.min(approvedWithinRange, this.totalDeliveries);

    if ((project.deliveriesCompleted || 0) !== normalizedCompleted) {
      updates.deliveriesCompleted = normalizedCompleted;
    }

    if (normalizedCompleted >= this.totalDeliveries) {
      updates.status = config.projectStatus.COMPLETED;
      updates.statusDetail = 'all_deliveries_completed';
      updates.currentDeliveryNumber = null;
      updates.nextDueDate = null;
    } else if (project.anteprojectApprovedAt) {
      const expected = normalizedCompleted + 1;
      if (project.currentDeliveryNumber !== expected) {
        updates.currentDeliveryNumber = expected;
      }
    }

    return updates;
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

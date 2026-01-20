const DatabaseConnection = require('../../../database/connection');
const DeliveryRepository = require('../../../database/repositories/DeliveryRepository');
const ProjectRepository = require('../../../database/repositories/ProjectRepository');
const ProjectTimelineService = require('../../services/ProjectTimelineService');
const config = require('../../../config/database');

class SubmitDeliveryUseCase {
  constructor() {
    const db = DatabaseConnection.getInstance();
    this.deliveryRepository = new DeliveryRepository(db.getDatabase('deliveries'));
    this.projectRepository = new ProjectRepository(db.getDatabase('projects'));
    this.timelineService = new ProjectTimelineService();
  }

  async execute(projectId, deliveryNumber, data, studentId) {
    try {
      if (!projectId || !deliveryNumber) {
        throw new Error('Missing projectId or deliveryNumber');
      }

      const project = await this.projectRepository.findById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      this.timelineService.ensureAnteproject(project);

      const deliveries = await this.deliveryRepository.findByProject(projectId);
      const expectedNumber = this.timelineService.getExpectedDeliveryNumber(project, deliveries);

      if (!expectedNumber) {
        throw new Error('Project already completed');
      }

      if (expectedNumber !== deliveryNumber) {
        throw new Error(`Next delivery must be #${expectedNumber}`);
      }

      const blockingStatuses = [config.deliveryStatus.IN_REVIEW, config.deliveryStatus.PENDING];
      const pendingDelivery = deliveries.find((d) => d.deliveryNumber === deliveryNumber && blockingStatuses.includes(d.status));
      if (pendingDelivery) {
        throw new Error('Delivery already submitted and pending review');
      }

      const dueDate = project.nextDueDate
        ? new Date(project.nextDueDate)
        : this.timelineService.computeNextDueDate(project.lastDeliveryApprovedAt || project.anteprojectApprovedAt);

      const submittedAt = data.submittedAt ? new Date(data.submittedAt) : new Date();
      const delivery = {
        projectId,
        deliveryNumber,
        title: data.title || `Delivery ${deliveryNumber}`,
        description: data.description || '',
        attachments: data.attachments || [],
        status: config.deliveryStatus.IN_REVIEW,
        studentId: studentId || null,
        submittedAt,
        plannedDate: dueDate || null,
        dueDate: dueDate || null,
        actualDate: submittedAt,
      };

      const created = await this.deliveryRepository.create(delivery);

      await this.projectRepository.update(projectId, {
        statusDetail: `delivery_${deliveryNumber}_submitted`,
        currentDeliveryNumber: deliveryNumber,
      });

      return { success: true, delivery: created };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = SubmitDeliveryUseCase;

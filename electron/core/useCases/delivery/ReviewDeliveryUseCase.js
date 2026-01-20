const DatabaseConnection = require('../../../database/connection');
const DeliveryRepository = require('../../../database/repositories/DeliveryRepository');
const ProjectRepository = require('../../../database/repositories/ProjectRepository');
const ProjectTimelineService = require('../../services/ProjectTimelineService');
const config = require('../../../config/database');

class ReviewDeliveryUseCase {
  constructor() {
    const db = DatabaseConnection.getInstance();
    this.deliveryRepository = new DeliveryRepository(db.getDatabase('deliveries'));
    this.projectRepository = new ProjectRepository(db.getDatabase('projects'));
    this.timelineService = new ProjectTimelineService();
  }

  async execute(deliveryId, reviewerId, action, comments = '') {
    try {
      if (!deliveryId || !reviewerId || !action) {
        throw new Error('Missing parameters for review');
      }

      const delivery = await this.deliveryRepository.findById(deliveryId);
      if (!delivery) {
        throw new Error('Delivery not found');
      }

       const project = await this.projectRepository.findById(delivery.projectId);
       if (!project) {
         throw new Error('Project not found for delivery');
       }

      const status = action === 'approve' ? config.deliveryStatus.APPROVED : config.deliveryStatus.REJECTED;

      const reviewData = {
        reviewerId,
        reviewComments: comments,
      };

      const updated = await this.deliveryRepository.updateStatus(deliveryId, status, reviewData);

      try {
        const now = new Date();
        let projectUpdates;
        if (status === config.deliveryStatus.APPROVED) {
          projectUpdates = this.timelineService.applyApprovalUpdate(project, delivery.deliveryNumber, now);
        } else {
          projectUpdates = this.timelineService.applyRejectionUpdate(project, delivery.deliveryNumber, now);
        }

        const expirationUpdate = this.timelineService.detectExpiration({ ...project, ...projectUpdates }, now);
        await this.projectRepository.update(delivery.projectId, {
          ...projectUpdates,
          ...expirationUpdate,
        });
      } catch (err) {
        console.error('[ReviewDeliveryUseCase] timeline update failed', err);
      }

      return { success: true, delivery: updated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = ReviewDeliveryUseCase;

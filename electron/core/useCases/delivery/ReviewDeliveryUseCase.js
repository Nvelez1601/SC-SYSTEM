const DatabaseConnection = require('../../../database/connection');
const DeliveryRepository = require('../../../database/repositories/DeliveryRepository');
const ProjectRepository = require('../../../database/repositories/ProjectRepository');

class ReviewDeliveryUseCase {
  constructor() {
    const db = DatabaseConnection.getInstance();
    this.deliveryRepository = new DeliveryRepository(db.getDatabase('deliveries'));
    this.projectRepository = new ProjectRepository(db.getDatabase('projects'));
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

      const status = action === 'approve' ? 'approved' : 'rejected';

      const reviewData = {
        reviewerId,
        reviewComments: comments,
      };

      const updated = await this.deliveryRepository.updateStatus(deliveryId, status, reviewData);

      // Recalculate progress for the project (based on highest delivery number present)
      try {
        const deliveries = await this.deliveryRepository.findByProject(delivery.projectId);
        const highest = deliveries.reduce((max, d) => Math.max(max, d.deliveryNumber || 0), 0) || 1;
        const approvedCount = deliveries.filter(d => d.status === 'approved').length;
        const percent = Math.round((approvedCount / highest) * 100);

        await this.projectRepository.update(delivery.projectId, { progress: percent });
      } catch (err) {
        // Non-fatal: project progress update failed
        console.error('[ReviewDeliveryUseCase] project progress update failed', err);
      }

      return { success: true, delivery: updated };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = ReviewDeliveryUseCase;

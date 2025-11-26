const SubmitDeliveryUseCase = require('../core/useCases/delivery/SubmitDeliveryUseCase');
const ReviewDeliveryUseCase = require('../core/useCases/delivery/ReviewDeliveryUseCase');
const DatabaseConnection = require('../database/connection');
const DeliveryRepository = require('../database/repositories/DeliveryRepository');

class DeliveryController {
  constructor() {
    const db = DatabaseConnection.getInstance();
    this.deliveryRepo = new DeliveryRepository(db.getDatabase('deliveries'));
    console.log('[DeliveryController] initialized');
  }

  async submitDelivery(deliveryData) {
    try {
      console.log('[DeliveryController] submitDelivery called', {
        projectId: deliveryData && deliveryData.projectId,
        deliveryNumber: deliveryData && deliveryData.deliveryNumber,
      });

      const useCase = new SubmitDeliveryUseCase();
      const res = await useCase.execute(
        deliveryData.projectId,
        deliveryData.deliveryNumber,
        deliveryData,
        deliveryData.studentId
      );

      console.log('[DeliveryController] submitDelivery result', res);
      return res;
    } catch (err) {
      console.error('[DeliveryController] submitDelivery error', err);
      return { success: false, error: err.message };
    }
  }

  async reviewDelivery(deliveryId, reviewerId, action, comments) {
    try {
      console.log('[DeliveryController] reviewDelivery called', { deliveryId, reviewerId, action });
      const useCase = new ReviewDeliveryUseCase();
      const res = await useCase.execute(deliveryId, reviewerId, action, comments);
      console.log('[DeliveryController] reviewDelivery result', res);
      return res;
    } catch (err) {
      console.error('[DeliveryController] reviewDelivery error', err);
      return { success: false, error: err.message };
    }
  }

  async getByProject(projectId) {
    try {
      const deliveries = await this.deliveryRepo.findByProject(projectId);
      return { success: true, deliveries };
    } catch (err) {
      console.error('[DeliveryController] getByProject error', err);
      return { success: false, error: err.message };
    }
  }

  async getPendingReviews() {
    try {
      const deliveries = await this.deliveryRepo.findPendingReviews();
      return { success: true, deliveries };
    } catch (err) {
      console.error('[DeliveryController] getPendingReviews error', err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = DeliveryController;

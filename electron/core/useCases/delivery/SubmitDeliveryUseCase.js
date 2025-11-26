const DatabaseConnection = require('../../../database/connection');
const DeliveryRepository = require('../../../database/repositories/DeliveryRepository');

class SubmitDeliveryUseCase {
  constructor() {
    const db = DatabaseConnection.getInstance();
    this.deliveryRepository = new DeliveryRepository(db.getDatabase('deliveries'));
  }

  async execute(projectId, deliveryNumber, data, studentId) {
    try {
      if (!projectId || !deliveryNumber) {
        throw new Error('Missing projectId or deliveryNumber');
      }

      const canSubmit = await this.deliveryRepository.canSubmitNextDelivery(projectId, deliveryNumber);

      if (!canSubmit) {
        return { success: false, error: 'Previous delivery not approved yet' };
      }

      const delivery = {
        projectId,
        deliveryNumber,
        title: data.title || `Delivery ${deliveryNumber}`,
        description: data.description || '',
        attachments: data.attachments || [],
        status: 'in_review',
        studentId: studentId || null,
        submittedAt: new Date(),
      };

      const created = await this.deliveryRepository.create(delivery);

      return { success: true, delivery: created };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = SubmitDeliveryUseCase;

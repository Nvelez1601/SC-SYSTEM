const BaseRepository = require('./BaseRepository');

class DeliveryRepository extends BaseRepository {
  constructor(db) {
    super(db);
  }

  async findByProject(projectId) {
    return new Promise((resolve, reject) => {
      this.db.find({ projectId })
        .sort({ deliveryNumber: 1 })
        .exec((err, docs) => {
          if (err) reject(err);
          else resolve(docs);
        });
    });
  }

  async findByStatus(status) {
    return this.findAll({ status });
  }

  async findPendingReviews() {
    return this.findAll({ status: { $in: ['in_review', 'pending'] } });
  }

  async findByReviewer(reviewerId) {
    return this.findAll({ reviewerId });
  }

  async getLastDelivery(projectId) {
    return new Promise((resolve, reject) => {
      this.db.find({ projectId })
        .sort({ deliveryNumber: -1 })
        .limit(1)
        .exec((err, docs) => {
          if (err) reject(err);
          else resolve(docs[0] || null);
        });
    });
  }

  async updateStatus(deliveryId, status, reviewData = {}) {
    return this.update(deliveryId, {
      status,
      ...reviewData,
      reviewedAt: new Date(),
    });
  }

  async canSubmitNextDelivery(projectId, deliveryNumber) {
    if (deliveryNumber === 1) {
      return true; // First delivery can always be submitted
    }

    const previousDelivery = await this.findOne({
      projectId,
      deliveryNumber: deliveryNumber - 1,
    });

    return previousDelivery && previousDelivery.status === 'approved';
  }
}

module.exports = DeliveryRepository;

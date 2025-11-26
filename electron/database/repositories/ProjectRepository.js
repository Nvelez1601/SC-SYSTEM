const BaseRepository = require('./BaseRepository');

class ProjectRepository extends BaseRepository {
  constructor(db) {
    super(db);
  }

  async findByProjectCode(projectCode) {
    return this.findOne({ projectCode });
  }

  async findByStatus(status) {
    return this.findAll({ status });
  }

  async findByStudent(studentId) {
    return this.findAll({ studentId });
  }

  async findByReviewer(reviewerId) {
    return this.findAll({ reviewerId });
  }

  async findActiveProjects() {
    return this.findAll({ status: 'active' });
  }

  async findExpiringSoon(days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return new Promise((resolve, reject) => {
      this.db.find({
        status: 'active',
        endDate: { $lte: futureDate },
      }, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  }

  async updateStatus(projectId, status) {
    return this.update(projectId, { status });
  }
}

module.exports = ProjectRepository;

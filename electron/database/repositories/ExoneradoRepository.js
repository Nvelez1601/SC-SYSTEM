const BaseRepository = require('./BaseRepository');

class ExoneradoRepository extends BaseRepository {
  constructor(db) {
    super(db);
  }

  async findByCedula(cedula) {
    return this.findOne({ cedula });
  }
}

module.exports = ExoneradoRepository;

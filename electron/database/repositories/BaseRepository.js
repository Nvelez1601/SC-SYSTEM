class BaseRepository {
  constructor(db) {
    this.db = db;
  }

  findAll(query = {}) {
    return new Promise((resolve, reject) => {
      this.db.find(query, (err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  }

  findOne(query) {
    return new Promise((resolve, reject) => {
      this.db.findOne(query, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
  }

  findById(id) {
    return new Promise((resolve, reject) => {
      this.db.findOne({ _id: id }, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
  }

  create(data) {
    return new Promise((resolve, reject) => {
      const document = {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      this.db.insert(document, (err, newDoc) => {
        if (err) reject(err);
        else resolve(newDoc);
      });
    });
  }

  update(id, data) {
    return new Promise((resolve, reject) => {
      const updateData = {
        ...data,
        updatedAt: new Date(),
      };
      
      this.db.update(
        { _id: id },
        { $set: updateData },
        { returnUpdatedDocs: true },
        (err, numAffected, affectedDocuments) => {
          if (err) reject(err);
          else resolve(affectedDocuments);
        }
      );
    });
  }

  delete(id) {
    return new Promise((resolve, reject) => {
      this.db.remove({ _id: id }, {}, (err, numRemoved) => {
        if (err) reject(err);
        else resolve(numRemoved);
      });
    });
  }

  count(query = {}) {
    return new Promise((resolve, reject) => {
      this.db.count(query, (err, count) => {
        if (err) reject(err);
        else resolve(count);
      });
    });
  }
}

module.exports = BaseRepository;

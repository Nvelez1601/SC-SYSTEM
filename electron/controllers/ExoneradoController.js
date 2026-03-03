const DatabaseConnection = require('../database/connection');
const ExoneradoRepository = require('../database/repositories/ExoneradoRepository');

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : value || '');
const normalizeDocument = (value) => (value ? value.toString().replace(/[^0-9A-Za-z]/g, '').toUpperCase() : '');
const generateCode = () => `EX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

class ExoneradoController {
  constructor() {
    const db = DatabaseConnection.getInstance();
    this.exoneradoRepo = new ExoneradoRepository(db.getDatabase('exonerados'));
  }

  async getAll() {
    const exonerados = await this.exoneradoRepo.findAll({});
    return { success: true, exonerados };
  }

  async create(payload) {
    const code = sanitizeString(payload.code) || generateCode();
    const cedula = normalizeDocument(payload.cedula);
    const now = new Date();
    const record = {
      code,
      apellido: sanitizeString(payload.apellido),
      nombre: sanitizeString(payload.nombre),
      cedula,
      universidadTsu: sanitizeString(payload.universidadTsu),
      fechaServicio: sanitizeString(payload.fechaServicio),
      titulo: sanitizeString(payload.titulo),
      observaciones: sanitizeString(payload.observaciones),
      razonExoneracion: sanitizeString(payload.razonExoneracion),
      proyectoTitulo: sanitizeString(payload.proyectoTitulo),
      proyectoCodigo: sanitizeString(payload.proyectoCodigo),
      createdAt: now,
      updatedAt: now,
    };

    const created = await this.exoneradoRepo.create(record);
    return { success: true, exonerado: created };
  }

  async update(exoneradoId, payload) {
    const updates = {
      apellido: payload.apellido !== undefined ? sanitizeString(payload.apellido) : undefined,
      nombre: payload.nombre !== undefined ? sanitizeString(payload.nombre) : undefined,
      cedula: payload.cedula !== undefined ? normalizeDocument(payload.cedula) : undefined,
      universidadTsu: payload.universidadTsu !== undefined ? sanitizeString(payload.universidadTsu) : undefined,
      fechaServicio: payload.fechaServicio !== undefined ? sanitizeString(payload.fechaServicio) : undefined,
      titulo: payload.titulo !== undefined ? sanitizeString(payload.titulo) : undefined,
      observaciones: payload.observaciones !== undefined ? sanitizeString(payload.observaciones) : undefined,
      razonExoneracion: payload.razonExoneracion !== undefined ? sanitizeString(payload.razonExoneracion) : undefined,
      proyectoTitulo: payload.proyectoTitulo !== undefined ? sanitizeString(payload.proyectoTitulo) : undefined,
      proyectoCodigo: payload.proyectoCodigo !== undefined ? sanitizeString(payload.proyectoCodigo) : undefined,
      updatedAt: new Date(),
    };

    Object.keys(updates).forEach((key) => {
      if (updates[key] === undefined) delete updates[key];
    });

    const updated = await this.exoneradoRepo.update(exoneradoId, updates);
    return { success: true, exonerado: updated };
  }

  async remove(exoneradoId) {
    const removed = await this.exoneradoRepo.delete(exoneradoId);
    return { success: true, removed };
  }
}

module.exports = ExoneradoController;

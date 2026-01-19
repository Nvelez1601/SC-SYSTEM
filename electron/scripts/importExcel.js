const XLSX = require('xlsx');
const DatabaseConnection = require('../database/connection');
const path = require('path');
const ProjectRepository = require('../database/repositories/ProjectRepository');
const DeliveryRepository = require('../database/repositories/DeliveryRepository');

function normalizeHeader(str) {
  if (!str && str !== 0) return '';
  return str.toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function mapRow(row) {
  const mapped = {};
  const keys = Object.keys(row);
  const firstKeyNormalized = normalizeHeader(keys[0] || '');

  if (firstKeyNormalized.startsWith('__empty') || firstKeyNormalized === '') {
    const vals = Object.values(row || {});
    mapped.studentName = `${(vals[0] || '').toString().trim()} ${(vals[1] || '').toString().trim()}`.trim();
    mapped.studentId = vals[2] || '';
    mapped.semester = vals[3] || '';
    mapped.title = vals[4] || mapped.studentName || '';
    mapped.community = vals[5] || '';
    mapped.deliveryDate = vals[6] || vals[7] || '';
    mapped.cutoffDate = vals[7] || vals[8] || '';
    mapped.submitSignature = vals[8] || '';
    mapped.cutoffSignature = vals[9] || '';
    mapped.observations = vals[10] || '';
  } else {
    for (const key of keys) {
      const nk = normalizeHeader(key);
      const val = row[key];

      if (nk === 'id' || nk === 'codigo' || nk === 'projectcode' || nk === 'proyecto') mapped.projectCode = val;
      else if (nk.includes('nombre')) mapped.studentName = val;
      else if (nk.includes('cedula') || nk.includes('documento')) mapped.studentId = val;
      else if (nk.includes('semestre')) mapped.semester = val;
      else if (nk.includes('titulo') || nk.includes('servicio')) mapped.title = val;
      else if (nk.includes('comunidad')) mapped.community = val;
      else if (nk.includes('fechas de entrega') || nk.includes('fecha de entrega') || nk.includes('fecha_entrega') || nk === 'fecha') mapped.deliveryDate = val;
      else if (nk.includes('fecha de caducidad') || nk.includes('caducidad') || nk.includes('corte')) mapped.cutoffDate = val;
      else if (nk.includes('firma de entrega') || nk.includes('firma_entrega')) mapped.submitSignature = val;
      else if (nk.includes('firma de corte') || nk.includes('firma_corte')) mapped.cutoffSignature = val;
      else if (nk.includes('observacion') || nk.includes('observaciones')) mapped.observations = val;
      else mapped[nk] = val;
    }
  }
  return mapped;
}

function parseDate(value) {
  if (!value && value !== 0) return null;
  // If already a Date
  if (value instanceof Date) return value;
  // If Excel serial date (number), convert from days since 1899-12-31
  if (typeof value === 'number') {
    const dt = new Date(Math.round((value - 25569) * 86400 * 1000));
    return dt;
  }
  // Try native parse
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

async function importExcel(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const db = DatabaseConnection.getInstance();
  await db.initialize();
  const projectRepo = new ProjectRepository(db.getDatabase('projects'));
  const deliveryRepo = new DeliveryRepository(db.getDatabase('deliveries'));

  const results = { createdProjects: 0, createdDeliveries: 0, errors: [] };

  for (const row of rows) {
    try {
      const m = mapRow(row);

      let projectCode = m.projectCode || (m.studentId ? `${m.studentId}-${(m.title || '').toString().slice(0, 30)}` : null);

      let project = null;
      if (projectCode) project = await projectRepo.findByProjectCode(projectCode);
      if (!project && m.studentId) {
        const projects = await projectRepo.findByStudent(m.studentId);
        project = projects && projects[0];
      }

      if (!project) {
        const generatedCode = `AUTO-${(m.studentId || 'X').toString().replace(/[^a-zA-Z0-9_-]/g, '')}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
        const toCreate = {
          projectCode: projectCode || generatedCode,
          title: m.title || m.studentName || 'Sin titulo',
          studentId: m.studentId || null,
          studentName: m.studentName || null,
          semester: m.semester || null,
          community: m.community || null,
          endDate: m.cutoffDate ? parseDate(m.cutoffDate) : null,
          progress: 0,
        };

        project = await projectRepo.create(toCreate);
        results.createdProjects++;
      }

      const lastDelivery = await deliveryRepo.getLastDelivery(project._id);
      const deliveryNumber = lastDelivery ? (lastDelivery.deliveryNumber || 0) + 1 : 1;

      const deliveryData = {
        projectId: project._id,
        deliveryNumber,
        deliveryDate: m.deliveryDate ? parseDate(m.deliveryDate) : null,
        dueDate: m.cutoffDate ? parseDate(m.cutoffDate) : null,
        submitSignature: m.submitSignature || null,
        cutoffSignature: m.cutoffSignature || null,
        observations: m.observations || null,
        status: m.cutoffSignature ? 'completed' : (m.submitSignature ? 'submitted' : 'pending'),
      };

      // Avoid creating duplicate deliveries for same project & deliveryDate
      const existingDelivery = await deliveryRepo.findOne({ projectId: project._id, deliveryDate: deliveryData.deliveryDate });
      if (!existingDelivery) {
        await deliveryRepo.create(deliveryData);
        results.createdDeliveries++;
      }
    } catch (err) {
      results.errors.push({ row, error: err && err.message ? err.message : String(err) });
    }
  }

  return { success: true, results };
}

async function recordImportHistory(filePath, results) {
  try {
    const db = DatabaseConnection.getInstance();
    const importsDb = db.getDatabase('imports');
    if (!importsDb) return;

    const record = {
      fileName: path.basename(filePath || ''),
      importedAt: new Date(),
      summary: {
        createdProjects: results.createdProjects || 0,
        createdDeliveries: results.createdDeliveries || 0,
        errors: (results.errors && results.errors.length) || 0,
      },
      raw: results,
    };

    importsDb.insert(record, (err, newDoc) => {
      if (err) console.error('Failed to record import history', err);
    });
  } catch (err) {
    console.error('recordImportHistory error', err);
  }
}

module.exports = async function(filePath) {
  const res = await importExcel(filePath);
  await recordImportHistory(filePath, res.results || { createdProjects: 0, createdDeliveries: 0, errors: [] });
  return res;
};

module.exports = importExcel;

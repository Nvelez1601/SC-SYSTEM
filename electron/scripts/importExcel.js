const XLSX = require('xlsx');
const path = require('path');
const DatabaseConnection = require('../database/connection');
const ProjectRepository = require('../database/repositories/ProjectRepository');
const ProjectTimelineService = require('../core/services/ProjectTimelineService');

function normalizeHeader(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function isLikelyHeaderRow(row = []) {
  if (!Array.isArray(row) || row.length === 0) return false;
  const normalized = row.map((cell) => normalizeHeader(cell));
  const tokens = ['nombres', 'apellidos', 'cedula', 'semestre', 'titulo tc', 'comunidad'];
  const matches = tokens.filter((token) => normalized.some((cell) => cell.includes(token)));
  return matches.length >= 3;
}

function extractRows(sheet) {
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length === 0) {
    return [];
  }

  let headerIndex = rawRows.findIndex((row) => isLikelyHeaderRow(row));
  if (headerIndex === -1) {
    headerIndex = 0;
  }

  const headerRow = rawRows[headerIndex].map((value, idx) => {
    const cellValue = value !== undefined && value !== null ? String(value).trim() : '';
    return cellValue || `__col_${idx}`;
  });

  const rows = [];
  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row) continue;
    const hasContent = row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== '');
    if (!hasContent) continue;

    const obj = {};
    headerRow.forEach((headerCell, idx) => {
      obj[headerCell] = row[idx] !== undefined ? row[idx] : '';
    });
    rows.push(obj);
  }

  return rows;
}

function mapRow(row) {
  if (!row) return {};

  const normalized = {};
  Object.entries(row).forEach(([key, value], index) => {
    const baseKey = normalizeHeader(key) || `__col_${index}`;
    let finalKey = baseKey;
    let counter = 1;
    while (normalized.hasOwnProperty(finalKey)) {
      finalKey = `${baseKey}__${counter++}`;
    }
    normalized[finalKey] = value;
  });

  const pick = (candidates = []) => {
    for (const key of candidates) {
      if (normalized[key] !== undefined && normalized[key] !== '') {
        return normalized[key];
      }
    }
    return '';
  };

  return {
    rowNumber: pick(['no.', 'no', 'numero', '__col_0']),
    firstNames: pick(['nombres']),
    lastNames: pick(['apellidos']),
    studentDocument: pick(['cedula', 'cédula', 'cedula.', 'cedula estudiante', 'cedula de identidad', 'cedula__1']),
    semester: pick(['semestre', 'semestre academico', 'semestre actual']),
    title: pick(['titulo tc', 'titulo tc.', 'titulo tc__1', 'titulo', 'titulo proyecto']),
    community: pick(['comunidad', 'comuna', 'comunidad.', 'comunidad__1']),
    certificateNumber: pick(['numero de certificado', 'número de certificado', 'numero de certificado.']),
  };
}

function sanitizeText(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return value.toString().replace(/\s+/g, ' ').trim();
}

function sanitizeDocument(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return value.toString().trim();
}

function normalizeStudentId(value) {
  if (!value) return '';
  return value.toString().toUpperCase().replace(/[^0-9A-Z-]/g, '');
}

function parseDateValue(value) {
  if (!value && value !== 0) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'number') {
    const millis = Math.round((value - 25569) * 86400 * 1000);
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const text = value.toString().trim();
  if (!text) return null;
  const slashMatch = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]) - 1;
    const year = Number(slashMatch[3].length === 2 ? `20${slashMatch[3]}` : slashMatch[3]);
    const parsed = new Date(Date.UTC(year, month, day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function hasMeaningfulData(mapped) {
  return Boolean(
    sanitizeText(mapped.firstNames) ||
      sanitizeText(mapped.lastNames) ||
      sanitizeDocument(mapped.studentDocument) ||
      sanitizeText(mapped.title) ||
      sanitizeText(mapped.community)
  );
}

function deriveProjectCode({ rowNumber }) {
  return sanitizeText(rowNumber);
}

function buildLookupQueries(payload) {
  const queries = [];
  if (payload.certificateNumber) queries.push({ certificateNumber: payload.certificateNumber });
  if (payload.projectCode) queries.push({ projectCode: payload.projectCode });
  if (payload.rowNumber) queries.push({ rowNumber: payload.rowNumber });
  if (payload.studentDocument) queries.push({ studentDocument: payload.studentDocument });
  if (payload.studentId) queries.push({ studentId: payload.studentId });
  return queries;
}

async function upsertProject(mapped, context) {
  const studentFirstNames = sanitizeText(mapped.firstNames);
  const studentLastNames = sanitizeText(mapped.lastNames);
  const studentDocument = sanitizeDocument(mapped.studentDocument);
  const studentId = normalizeStudentId(studentDocument);
  const semester = sanitizeText(mapped.semester);
  const community = sanitizeText(mapped.community);
  const certificateNumber = sanitizeText(mapped.certificateNumber);
  const rowNumber = sanitizeText(mapped.rowNumber);

  const titleCandidate = sanitizeText(mapped.title);
  const fallbackName = [studentLastNames, studentFirstNames].filter(Boolean).join(' / ');
  const title = titleCandidate || fallbackName || 'Proyecto sin título';
  const studentName = fallbackName || studentDocument;
  const projectCode = deriveProjectCode({ rowNumber });

  const payload = {
    title,
    rowNumber,
    studentName,
    studentFirstNames,
    studentLastNames,
    studentDocument,
    studentId,
    member1FirstNames: '',
    member1LastNames: '',
    member2FirstNames: '',
    member2LastNames: '',
    semester,
    community,
    certificateNumber,
    projectCode,
    approvedBy: context.registrant,
    registeredBy: context.registrant,
  };

  const queries = buildLookupQueries(payload);
  let existing = null;
  for (const query of queries) {
    if (!query || Object.keys(query).length === 0) continue;
    const found = await context.projectRepo.findOne(query);
    if (found) {
      existing = found;
      break;
    }
  }

  if (!existing) {
    const defaults = context.timelineService.buildInitialFields({ anteprojectApprovedAt: anteprojectApprovedAt || undefined });
    await context.projectRepo.create({
      ...defaults,
      ...payload,
      totalDeliveries: context.timelineService.totalDeliveries,
    });
    context.results.createdProjects += 1;
    return;
  }

  const updates = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (!value) return;
    if (!existing[key] || existing[key] !== value) {
      updates[key] = value;
    }
  });

  if (!existing.registeredBy) {
    updates.registeredBy = context.registrant;
  }

  if (Object.keys(updates).length > 0) {
    await context.projectRepo.update(existing._id, updates);
    context.results.updatedProjects += 1;
  } else {
    context.results.skippedRows += 1;
  }
}

async function importExcel(filePath, options = {}) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = extractRows(sheet);

  const db = DatabaseConnection.getInstance();
  await db.initialize();
  const projectRepo = new ProjectRepository(db.getDatabase('projects'));
  const timelineService = new ProjectTimelineService();

  const registrant = sanitizeText(options.requestedBy) || 'import-excel';
  const results = {
    createdProjects: 0,
    updatedProjects: 0,
    skippedRows: 0,
    createdDeliveries: 0,
    errors: [],
  };

  for (const row of rows) {
    try {
      const mapped = mapRow(row);
      if (!hasMeaningfulData(mapped)) {
        results.skippedRows += 1;
        continue;
      }
      await upsertProject(mapped, { projectRepo, timelineService, registrant, results });
    } catch (error) {
      results.errors.push({
        row,
        message: error && error.message ? error.message : String(error),
      });
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
        updatedProjects: results.updatedProjects || 0,
        createdDeliveries: results.createdDeliveries || 0,
        errors: (results.errors && results.errors.length) || 0,
      },
      raw: results,
    };

    importsDb.insert(record, (err) => {
      if (err) {
        console.error('Failed to record import history', err);
      }
    });
  } catch (err) {
    console.error('recordImportHistory error', err);
  }
}

module.exports = async function(filePath, options = {}) {
  const res = await importExcel(filePath, options);
  await recordImportHistory(filePath, res.results || { createdProjects: 0, createdDeliveries: 0, errors: [] });
  return res;
};

module.exports.importExcel = importExcel;

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
  const defaultHeaderRow = ['No.', 'NOMBRES', 'APELLIDOS', 'CÉDULA', 'SEMESTRE', 'TITULO TC', 'COMUNIDAD'];
  if (headerIndex === -1) {
    headerIndex = -1;
  }

  const headerRowSource = headerIndex >= 0 ? rawRows[headerIndex] : defaultHeaderRow;
  const headerRow = headerRowSource.map((value, idx) => {
    const cellValue = value !== undefined && value !== null ? String(value).trim() : '';
    return cellValue || `__col_${idx}`;
  });

  const rows = [];
  const startIndex = headerIndex >= 0 ? headerIndex + 1 : 0;
  for (let i = startIndex; i < rawRows.length; i++) {
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
    boxNumber: pick(['caja nº', 'caja n°', 'caja n', 'caja', 'caja nº__1', 'caja n°__1', 'caja n__1', 'numero de caja', 'número de caja']),
    certificateNumber: pick(['numero de certificado', 'número de certificado', 'numero de certificado.']),
    receivedBy: pick(['recibido por', 'recibido por__1', 'recibido por.', 'recibido por__2']),
    anteprojectDate: pick(['entrega ap', 'entrega ap.', 'entrega ap__1']),
    deliveryDate: pick(['entrega p', 'entrega p.', 'entrega p__1']),
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
  return value
    .toString()
    .toUpperCase()
    .replace(/[^0-9A-Z-]/g, '')
    .trim();
}

function isLikelyDocumentValue(value) {
  if (!value) return false;
  const text = value.toString().trim();
  if (!text) return false;
  if (/[A-Za-z]/.test(text)) return false;
  const digits = text.match(/\d/g);
  return Array.isArray(digits) && digits.length >= 6;
}

function splitDocumentCandidates(value) {
  if (!value) return [];
  return value
    .toString()
    .split(/[\s,;/]+/)
    .map((part) => part.trim())
    .filter((part) => part);
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

function isContinuationRow(mapped) {
  const hasRowNumber = Boolean(sanitizeText(mapped.rowNumber));
  if (hasRowNumber) return false;
  const hasMemberData = Boolean(
    sanitizeText(mapped.firstNames) ||
      sanitizeText(mapped.lastNames) ||
      sanitizeDocument(mapped.studentDocument)
  );
  const hasProjectData = Boolean(
    sanitizeText(mapped.title) ||
      sanitizeText(mapped.community) ||
      sanitizeText(mapped.semester)
  );
  return hasMemberData && !hasProjectData;
}

function generateRowNumber() {
  return `SC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function buildLookupQueries(payload) {
  const queries = [];
  if (payload.boxNumber) queries.push({ boxNumber: payload.boxNumber });
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
  let semester = sanitizeText(mapped.semester);
  const community = sanitizeText(mapped.community);
  const certificateNumber = sanitizeText(mapped.certificateNumber);
  const boxNumber = sanitizeText(mapped.boxNumber) || certificateNumber;
  const rowNumber = sanitizeText(mapped.rowNumber) || generateRowNumber();
  const receivedBy = sanitizeText(mapped.receivedBy);
  const registrant = receivedBy || context.registrant;
  const anteprojectApprovedAt = parseDateValue(mapped.anteprojectDate);

  const titleCandidate = sanitizeText(mapped.title);
  const fallbackName = [studentLastNames, studentFirstNames].filter(Boolean).join(' / ');
  const title = titleCandidate || fallbackName || 'Proyecto sin título';
  const studentName = fallbackName || studentDocument;
  const projectCode = rowNumber;

  let member1Document = studentDocument;
  let member2Document = '';

  if (isLikelyDocumentValue(semester)) {
    const candidates = splitDocumentCandidates(semester).filter(isLikelyDocumentValue);
    if (candidates.length >= 1) {
      if (!member1Document) member1Document = candidates[0];
      if (!member2Document && candidates.length > 1) member2Document = candidates[1];
      semester = '';
    }
  }

  const payload = {
    title,
    rowNumber,
    studentName,
    studentFirstNames,
    studentLastNames,
    studentDocument,
    studentId,
    member1FirstNames: studentFirstNames,
    member1LastNames: studentLastNames,
    member1Document,
    member2FirstNames: '',
    member2LastNames: '',
    member2Document,
    semester,
    community,
    boxNumber,
    projectCode,
    approvedBy: registrant,
    registeredBy: registrant,
    anteprojectApprovedAt: anteprojectApprovedAt || undefined,
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
    const defaults = context.timelineService.buildInitialFields({ anteprojectApprovedAt: anteprojectApprovedAt || null });
    const created = await context.projectRepo.create({
      ...defaults,
      ...payload,
      totalDeliveries: context.timelineService.totalDeliveries,
    });
    context.results.createdProjects += 1;
    return created;
  }

  const updates = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (!value) return;
    if (!existing[key] || existing[key] !== value) {
      updates[key] = value;
    }
  });

  if (anteprojectApprovedAt && !existing.anteprojectApprovedAt) {
    Object.assign(updates, context.timelineService.applyAnteprojectApproval(existing, anteprojectApprovedAt));
    updates.approvedBy = registrant;
  }

  if (!existing.registeredBy) {
    updates.registeredBy = registrant;
  }

  if (Object.keys(updates).length > 0) {
    const updated = await context.projectRepo.update(existing._id, updates);
    context.results.updatedProjects += 1;
    return updated || existing;
  } else {
    context.results.skippedRows += 1;
    return existing;
  }
}

async function appendMemberToLastProject(mapped, context) {
  const lastProject = context.lastProject;
  if (!lastProject) return null;

  const memberFirstNames = sanitizeText(mapped.firstNames);
  const memberLastNames = sanitizeText(mapped.lastNames);
  const memberDocument = sanitizeDocument(mapped.studentDocument);

  if (!memberFirstNames && !memberLastNames && !memberDocument) return null;

  const updates = {};
  if (!lastProject.member2FirstNames && memberFirstNames) updates.member2FirstNames = memberFirstNames;
  if (!lastProject.member2LastNames && memberLastNames) updates.member2LastNames = memberLastNames;
  if (!lastProject.member2Document && memberDocument) updates.member2Document = memberDocument;

  if (Object.keys(updates).length === 0) {
    context.results.skippedRows += 1;
    return lastProject;
  }

  const updated = await context.projectRepo.update(lastProject._id, updates);
  context.results.updatedProjects += 1;
  return updated || lastProject;
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

  let lastProject = null;

  for (const row of rows) {
    try {
      const mapped = mapRow(row);
      if (!hasMeaningfulData(mapped)) {
        results.skippedRows += 1;
        continue;
      }
      if (isContinuationRow(mapped)) {
        const updated = await appendMemberToLastProject(mapped, {
          projectRepo,
          timelineService,
          registrant,
          results,
          lastProject,
        });
        if (updated) {
          lastProject = updated;
        }
        continue;
      }

      const project = await upsertProject(mapped, { projectRepo, timelineService, registrant, results });
      if (project) {
        lastProject = project;
      }
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

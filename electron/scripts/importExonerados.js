const XLSX = require('xlsx');
const path = require('path');
const DatabaseConnection = require('../database/connection');
const ExoneradoController = require('../controllers/ExoneradoController');

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
  const tokens = ['apellido', 'nombre', 'cedula', 'universidad', 'razon', 'exoneracion', 'proyecto'];
  const matches = tokens.filter((token) => normalized.some((cell) => cell.includes(token)));
  return matches.length >= 3;
}

function extractRows(sheet) {
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length === 0) {
    return [];
  }

  let headerIndex = rawRows.findIndex((row) => isLikelyHeaderRow(row));
  const defaultHeaderRow = ['Codigo', 'Apellido', 'Nombre', 'Cedula', 'Universidad/TSU', 'Ano servicio', 'Titulo', 'Razon', 'Proyecto', 'Codigo proyecto', 'Observaciones'];
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
    while (Object.prototype.hasOwnProperty.call(normalized, finalKey)) {
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
    code: pick(['codigo', 'código', 'code', 'cod', '__col_0']),
    apellido: pick(['apellido', 'apellidos', 'last name', '__col_1']),
    nombre: pick(['nombre', 'nombres', 'first name', '__col_2']),
    cedula: pick(['cedula', 'cédula', 'documento', 'documento identidad', '__col_3']),
    universidadTsu: pick(['universidad/tsu', 'universidad', 'universidad tsu', 'tsu', '__col_4']),
    fechaServicio: pick(['ano servicio', 'año servicio', 'anio servicio', 'year', '__col_5']),
    titulo: pick(['titulo', 'título', 'grado', '__col_6']),
    razonExoneracion: pick(['razon', 'razon exoneracion', 'razon de exoneracion', 'exoneracion', '__col_7']),
    proyectoTitulo: pick(['proyecto', 'proyecto titulo', 'titulo proyecto', '__col_8']),
    proyectoCodigo: pick(['codigo proyecto', 'código proyecto', 'proyecto codigo', '__col_9']),
    observaciones: pick(['observaciones', 'observacion', 'notas', '__col_10']),
  };
}

function sanitizeText(value) {
  if (value === undefined || value === null) {
    return '';
  }
  const text = value.toString().replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const lowered = text.toLowerCase();
  if (['null', 'undefined', 'nan', 'n/a'].includes(lowered)) return '';
  return text;
}

function hasMeaningfulData(mapped) {
  if (!mapped) return false;
  const fields = [
    mapped.code,
    mapped.apellido,
    mapped.nombre,
    mapped.cedula,
    mapped.universidadTsu,
    mapped.proyectoTitulo,
    mapped.proyectoCodigo,
  ];
  return fields.some((value) => sanitizeText(value));
}

async function importExonerados(filePath) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = extractRows(sheet);

  const db = DatabaseConnection.getInstance();
  await db.initialize();
  const controller = new ExoneradoController();

  const results = {
    created: 0,
    skippedRows: 0,
    errors: [],
  };

  for (const row of rows) {
    try {
      const mapped = mapRow(row);
      if (!hasMeaningfulData(mapped)) {
        results.skippedRows += 1;
        continue;
      }
      const payload = {
        code: sanitizeText(mapped.code),
        apellido: sanitizeText(mapped.apellido),
        nombre: sanitizeText(mapped.nombre),
        cedula: sanitizeText(mapped.cedula),
        universidadTsu: sanitizeText(mapped.universidadTsu),
        fechaServicio: sanitizeText(mapped.fechaServicio),
        titulo: sanitizeText(mapped.titulo),
        observaciones: sanitizeText(mapped.observaciones),
        razonExoneracion: sanitizeText(mapped.razonExoneracion),
        proyectoTitulo: sanitizeText(mapped.proyectoTitulo),
        proyectoCodigo: sanitizeText(mapped.proyectoCodigo),
      };

      const res = await controller.create(payload);
      if (res?.success) {
        results.created += 1;
      } else {
        results.errors.push({ row, message: res?.error || 'Error al crear registro' });
      }
    } catch (error) {
      results.errors.push({ row, message: error?.message || String(error) });
    }
  }

  return { success: true, results };
}

async function recordImportHistory(filePath, results, type = 'exonerados') {
  try {
    const db = DatabaseConnection.getInstance();
    const importsDb = db.getDatabase('imports');
    if (!importsDb) return;

    const record = {
      type,
      fileName: path.basename(filePath || ''),
      importedAt: new Date(),
      summary: {
        created: results.created || 0,
        skippedRows: results.skippedRows || 0,
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
  const res = await importExonerados(filePath, options);
  await recordImportHistory(filePath, res.results || { created: 0, skippedRows: 0, errors: [] }, options.type || 'exonerados');
  return res;
};

module.exports.importExonerados = importExonerados;

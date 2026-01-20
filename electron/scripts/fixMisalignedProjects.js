const DatabaseConnection = require('../database/connection');
const ProjectRepository = require('../database/repositories/ProjectRepository');

const generateRowNumber = () => `SC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const extractSemester = (value) => {
  if (!value) return '';
  const text = value.toString();
  const match = text.match(/\b\d{1,2}\s*(?:vo|ro|to|mo|no)?\.?\s*semestre\b/i);
  if (!match) return '';
  return match[0].replace(/\s+/g, ' ').trim().toUpperCase();
};

const isValidRowNumber = (value) => {
  if (!value) return false;
  const text = value.toString().trim();
  if (/^\d+$/.test(text)) return true;
  if (/^SC-[A-Z0-9-]+$/i.test(text)) return true;
  return false;
};

const isLikelyDocumentValue = (value) => {
  if (!value) return false;
  const text = value.toString().trim();
  if (!text) return false;
  if (/[A-Za-z]/.test(text)) return false;
  const digits = text.match(/\d/g);
  return Array.isArray(digits) && digits.length >= 6;
};

const splitDocumentCandidates = (value) => {
  if (!value) return [];
  return value
    .toString()
    .split(/[\s,;/]+/)
    .map((part) => part.trim())
    .filter((part) => part);
};

async function fixMisalignedProjects() {
  const db = DatabaseConnection.getInstance();
  await db.initialize();
  const projectRepo = new ProjectRepository(db.getDatabase('projects'));

  const projects = await projectRepo.findAll({});
  const usedCodes = new Set(projects.map((project) => project.projectCode).filter(Boolean));
  let updated = 0;
  let skipped = 0;

  for (const project of projects) {
    const updates = {};

    if (project.projectCode) {
      usedCodes.delete(project.projectCode);
    }

    const rowNumber = project.rowNumber ? project.rowNumber.toString().trim() : '';
    if (!isValidRowNumber(rowNumber)) {
      updates.rowNumber = generateRowNumber();
      updates.projectCode = updates.rowNumber;
    } else if (project.projectCode !== rowNumber) {
      updates.projectCode = rowNumber;
    }

    if (updates.projectCode && usedCodes.has(updates.projectCode)) {
      const fresh = generateRowNumber();
      updates.rowNumber = fresh;
      updates.projectCode = fresh;
    }

    let semester = project.semester ? project.semester.toString().trim() : '';
    if (!semester) {
      const fromRow = extractSemester(project.rowNumber);
      const fromCode = extractSemester(project.projectCode);
      const fromTitle = extractSemester(project.title);
      semester = fromRow || fromCode || fromTitle;
      if (semester) updates.semester = semester;
    }

    if (semester && isLikelyDocumentValue(semester)) {
      const candidates = splitDocumentCandidates(semester).filter(isLikelyDocumentValue);
      if (!project.member1Document && candidates[0]) {
        updates.member1Document = candidates[0];
      }
      if (!project.member2Document && candidates[1]) {
        updates.member2Document = candidates[1];
      }
      updates.semester = '';
    }

    if (Object.keys(updates).length > 0) {
      await projectRepo.update(project._id, updates);
      if (updates.projectCode) {
        usedCodes.add(updates.projectCode);
      }
      updated += 1;
    } else {
      if (project.projectCode) {
        usedCodes.add(project.projectCode);
      }
      skipped += 1;
    }
  }

  return { updated, skipped, total: projects.length };
}

module.exports = fixMisalignedProjects;

if (require.main === module) {
  fixMisalignedProjects()
    .then((result) => {
      console.log('[fixMisalignedProjects] done', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[fixMisalignedProjects] failed', error);
      process.exit(1);
    });
}

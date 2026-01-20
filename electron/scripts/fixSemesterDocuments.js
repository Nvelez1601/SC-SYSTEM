const DatabaseConnection = require('../database/connection');
const ProjectRepository = require('../database/repositories/ProjectRepository');

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

async function fixSemesterDocuments() {
  const db = DatabaseConnection.getInstance();
  await db.initialize();
  const projectRepo = new ProjectRepository(db.getDatabase('projects'));

  const projects = await projectRepo.findAll({});
  let updated = 0;
  let skipped = 0;

  for (const project of projects) {
    const semester = (project.semester || '').toString().trim();
    if (!isLikelyDocumentValue(semester)) {
      skipped += 1;
      continue;
    }

    const candidates = splitDocumentCandidates(semester).filter(isLikelyDocumentValue);
    if (candidates.length === 0) {
      skipped += 1;
      continue;
    }

    const updates = { semester: '' };
    if (!project.member1Document) {
      updates.member1Document = candidates[0];
    }
    if (!project.member2Document && candidates.length > 1) {
      updates.member2Document = candidates[1];
    }

    await projectRepo.update(project._id, updates);
    updated += 1;
  }

  return { updated, skipped, total: projects.length };
}

module.exports = fixSemesterDocuments;

if (require.main === module) {
  fixSemesterDocuments()
    .then((result) => {
      console.log('[fixSemesterDocuments] done', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[fixSemesterDocuments] failed', error);
      process.exit(1);
    });
}

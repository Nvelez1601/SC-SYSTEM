const DatabaseConnection = require('../database/connection');
const ProjectRepository = require('../database/repositories/ProjectRepository');

const normalizeSemesterLabel = (value) => {
  if (!value) return '';
  const text = value.toString().trim();
  if (!text) return '';
  const match = text.match(/(\d{1,2})\s*(?:vo|ro|to|mo|no)?\.?\s*semestre/i);
  if (!match) return '';
  const number = match[1];
  return `${number}VO. SEMESTRE`;
};

async function normalizeSemesters() {
  const db = DatabaseConnection.getInstance();
  await db.initialize();
  const projectRepo = new ProjectRepository(db.getDatabase('projects'));

  const projects = await projectRepo.findAll({});
  let updated = 0;
  let skipped = 0;

  for (const project of projects) {
    const current = project.semester ? project.semester.toString().trim() : '';
    const normalized = normalizeSemesterLabel(current);
    if (!current) {
      skipped += 1;
      continue;
    }

    if (!normalized) {
      await projectRepo.update(project._id, { semester: '' });
      updated += 1;
      continue;
    }

    if (normalized !== current) {
      await projectRepo.update(project._id, { semester: normalized });
      updated += 1;
    } else {
      skipped += 1;
    }
  }

  return { updated, skipped, total: projects.length };
}

module.exports = normalizeSemesters;

if (require.main === module) {
  normalizeSemesters()
    .then((result) => {
      console.log('[normalizeSemesters] done', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[normalizeSemesters] failed', error);
      process.exit(1);
    });
}

const DatabaseConnection = require('../database/connection');
const ProjectRepository = require('../database/repositories/ProjectRepository');

const generateRowNumber = () => `SC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

async function fixMissingRowNumbers() {
  const db = DatabaseConnection.getInstance();
  await db.initialize();
  const projectRepo = new ProjectRepository(db.getDatabase('projects'));

  const projects = await projectRepo.findAll({});
  let updated = 0;
  let skipped = 0;

  for (const project of projects) {
    const hasRow = Boolean(project.rowNumber && String(project.rowNumber).trim());
    const hasCode = Boolean(project.projectCode && String(project.projectCode).trim());

    if (hasRow && hasCode) {
      skipped += 1;
      continue;
    }

    const rowNumber = hasRow
      ? String(project.rowNumber).trim()
      : hasCode
        ? String(project.projectCode).trim()
        : generateRowNumber();

    const updates = {
      rowNumber,
      projectCode: rowNumber,
    };

    await projectRepo.update(project._id, updates);
    updated += 1;
  }

  return { updated, skipped, total: projects.length };
}

module.exports = fixMissingRowNumbers;

if (require.main === module) {
  fixMissingRowNumbers()
    .then((result) => {
      console.log('[fixMissingRowNumbers] done', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[fixMissingRowNumbers] failed', error);
      process.exit(1);
    });
}

const DatabaseConnection = require('../database/connection');
const ProjectRepository = require('../database/repositories/ProjectRepository');

async function fixBoxNumbers() {
  const db = DatabaseConnection.getInstance();
  await db.initialize();
  const projectRepo = new ProjectRepository(db.getDatabase('projects'));

  const projects = await projectRepo.findAll({});
  let updated = 0;
  let skipped = 0;

  for (const project of projects) {
    const boxNumber = project.boxNumber ? String(project.boxNumber).trim() : '';
    const certificateNumber = project.certificateNumber ? String(project.certificateNumber).trim() : '';

    if (boxNumber) {
      skipped += 1;
      continue;
    }

    if (!certificateNumber) {
      skipped += 1;
      continue;
    }

    await projectRepo.update(project._id, {
      boxNumber: certificateNumber,
    });
    updated += 1;
  }

  return { updated, skipped, total: projects.length };
}

module.exports = fixBoxNumbers;

if (require.main === module) {
  fixBoxNumbers()
    .then((result) => {
      console.log('[fixBoxNumbers] done', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('[fixBoxNumbers] failed', error);
      process.exit(1);
    });
}

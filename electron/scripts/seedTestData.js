const DatabaseConnection = require('../database/connection');
const ProjectRepository = require('../database/repositories/ProjectRepository');
const DeliveryRepository = require('../database/repositories/DeliveryRepository');
const UserRepository = require('../database/repositories/UserRepository');

async function seed() {
  try {
    const db = DatabaseConnection.getInstance();
    await db.initialize();

    const projectRepo = new ProjectRepository(db.getDatabase('projects'));
    const deliveryRepo = new DeliveryRepository(db.getDatabase('deliveries'));
    const userRepo = new UserRepository(db.getDatabase('users'));

    // Create a test student
    const student = await userRepo.create({
      username: 'student1',
      password: 'placeholder',
      email: 'student1@example.com',
      role: 'student',
      firstName: 'Student',
      lastName: 'One',
      active: true,
    });

    // Create a test reviewer (if not exists we'll create new)
    const reviewer = await userRepo.create({
      username: 'reviewer1',
      password: 'placeholder',
      email: 'reviewer1@example.com',
      role: 'reviewer',
      firstName: 'Reviewer',
      lastName: 'One',
      active: true,
    });

    // Create project
    const project = await projectRepo.create({
      projectCode: 'TEST-001',
      name: 'Community Service Test Project',
      description: 'Project used to seed test deliveries',
      studentId: student._id,
      reviewerId: reviewer._id,
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 3),
      progress: 0,
    });

    console.log('Seeded project:', project._id);

    // Create a first delivery already approved
    const d1 = await deliveryRepo.create({
      projectId: project._id,
      deliveryNumber: 1,
      title: 'Delivery 1',
      description: 'First delivery - approved',
      status: 'approved',
      studentId: student._id,
      reviewerId: reviewer._id,
      reviewComments: 'OK',
      reviewedAt: new Date(),
    });

    // Create a second delivery pending review (in_review) — should appear in reviewer dashboard
    const d2 = await deliveryRepo.create({
      projectId: project._id,
      deliveryNumber: 2,
      title: 'Delivery 2',
      description: 'Second delivery - pending review',
      status: 'in_review',
      studentId: student._id,
      reviewerId: reviewer._id,
      submittedAt: new Date(),
    });

    console.log('Seeded deliveries:', d1._id, d2._id);
    console.log('Seeding complete. You can now open the app and check the Reviewer Dashboard.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();

const DatabaseConnection = require('../database/connection');
const ProjectRepository = require('../database/repositories/ProjectRepository');
const DeliveryRepository = require('../database/repositories/DeliveryRepository');
const ProjectTimelineService = require('../core/services/ProjectTimelineService');
const config = require('../config/database');

const sanitizeString = (value) => (typeof value === 'string' ? value.trim() : value || '');
const composeStudentName = (firstNames, lastNames, fallback = '') => {
  const formatted = [lastNames, firstNames].filter(Boolean).join(' / ').trim();
  return formatted || fallback;
};
const documentToStudentId = (documentValue) => {
  if (!documentValue) return '';
  return documentValue.toString().replace(/[^0-9A-Za-z]/g, '').toUpperCase();
};

class ProjectController {
  constructor() {
    const db = DatabaseConnection.getInstance();
    this.projectRepo = new ProjectRepository(db.getDatabase('projects'));
    this.deliveryRepo = new DeliveryRepository(db.getDatabase('deliveries'));
    this.timelineService = new ProjectTimelineService();
  }

  getUserSignature(user) {
    if (!user) return 'desconocido';
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.username || user.email || 'desconocido';
  }

  ensureAuth(user) {
    if (!user) {
      throw new Error('Not authenticated');
    }
  }

  ensureRole(user, allowedRoles = []) {
    this.ensureAuth(user);
    if (!allowedRoles.includes(user.role)) {
      throw new Error('Insufficient permissions');
    }
  }

  async createProject(projectData, currentUser) {
    this.ensureRole(currentUser, [config.roles.SUPER_ADMIN, config.roles.ADMIN]);
    const defaults = this.timelineService.buildInitialFields(projectData);
    const registrant = sanitizeString(projectData.registeredBy) || this.getUserSignature(currentUser);
    const studentFirstNames = sanitizeString(projectData.studentFirstNames);
    const studentLastNames = sanitizeString(projectData.studentLastNames);
    const studentDocument = sanitizeString(projectData.studentDocument);
    const studentName = composeStudentName(studentFirstNames, studentLastNames, studentDocument || sanitizeString(projectData.studentName));
    const internalStudentId = documentToStudentId(studentDocument);
    const payload = {
      title: sanitizeString(projectData.title) || 'Proyecto sin título',
      description: sanitizeString(projectData.description) || '',
      rowNumber: sanitizeString(projectData.rowNumber) || '',
      projectCode: sanitizeString(projectData.projectCode) || sanitizeString(projectData.rowNumber) || '',
      studentName,
      studentFirstNames,
      studentLastNames,
      studentDocument,
      studentId: internalStudentId,
      member1FirstNames: sanitizeString(projectData.member1FirstNames) || '',
      member1LastNames: sanitizeString(projectData.member1LastNames) || '',
      member2FirstNames: sanitizeString(projectData.member2FirstNames) || '',
      member2LastNames: sanitizeString(projectData.member2LastNames) || '',
      semester: sanitizeString(projectData.semester) || '',
      community: sanitizeString(projectData.community) || '',
      certificateNumber: sanitizeString(projectData.certificateNumber) || '',
      registeredBy: registrant,
      approvedBy: projectData.approvedBy ? sanitizeString(projectData.approvedBy) : registrant || null,
      totalDeliveries: projectData.totalDeliveries || this.timelineService.totalDeliveries,
      ...defaults,
    };

    const created = await this.projectRepo.create(payload);
    return { success: true, project: created };
  }

  async updateProject(projectId, updates, currentUser) {
    this.ensureRole(currentUser, [config.roles.SUPER_ADMIN, config.roles.ADMIN, config.roles.REVIEWER]);
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    const allowedFields = [
      'title',
      'description',
      'rowNumber',
      'studentFirstNames',
      'studentLastNames',
      'studentDocument',
      'member1FirstNames',
      'member1LastNames',
      'member2FirstNames',
      'member2LastNames',
      'semester',
      'community',
      'certificateNumber',
      'projectCode',
      'registeredBy',
      'status',
      'statusDetail',
      'anteprojectApprovedAt',
    ];
    const sanitized = allowedFields.reduce((acc, key) => {
      if (updates[key] !== undefined) acc[key] = updates[key];
      return acc;
    }, {});

    Object.keys(sanitized).forEach((key) => {
      sanitized[key] = sanitizeString(sanitized[key]);
    });

    const nextFirstNames = sanitized.studentFirstNames !== undefined ? sanitized.studentFirstNames : project.studentFirstNames;
    const nextLastNames = sanitized.studentLastNames !== undefined ? sanitized.studentLastNames : project.studentLastNames;
    const nextDocument = sanitized.studentDocument !== undefined ? sanitized.studentDocument : project.studentDocument;

    if (
      sanitized.studentFirstNames !== undefined ||
      sanitized.studentLastNames !== undefined ||
      sanitized.studentDocument !== undefined
    ) {
      sanitized.studentName = composeStudentName(nextFirstNames, nextLastNames, nextDocument || project.studentName);
      sanitized.studentId = documentToStudentId(nextDocument);
    }

    if (sanitized.projectCode && !sanitized.projectCode.trim()) {
      delete sanitized.projectCode;
    } else if (!sanitized.projectCode && sanitized.rowNumber) {
      sanitized.projectCode = sanitized.rowNumber;
    }

    if (updates.anteprojectApprovedAt) {
      Object.assign(sanitized, this.timelineService.applyAnteprojectApproval(project, updates.anteprojectApprovedAt));
      sanitized.approvedBy = this.getUserSignature(currentUser);
    }

    const updated = await this.projectRepo.update(projectId, sanitized);
    return { success: true, project: updated };
  }

  async deleteProject(projectId, currentUser) {
    this.ensureRole(currentUser, [config.roles.SUPER_ADMIN]);
    const removed = await this.projectRepo.delete(projectId);
    return { success: true, removed };
  }

  async getAllProjects(filters = {}, currentUser) {
    this.ensureRole(currentUser, [config.roles.SUPER_ADMIN, config.roles.ADMIN, config.roles.REVIEWER]);
    const projects = await this.projectRepo.findAll(filters);
    const enriched = [];

    for (const project of projects) {
      const autoUpdates = this.timelineService.detectExpiration(project);
      let finalProject = project;
      if (autoUpdates && Object.keys(autoUpdates).length > 0) {
        finalProject = await this.projectRepo.update(project._id, autoUpdates);
      }

      const deliveries = await this.deliveryRepo.findByProject(project._id);
      const expectedDelivery = this.timelineService.getExpectedDeliveryNumber(finalProject, deliveries);
      enriched.push({
        ...finalProject,
        expectedDeliveryNumber: expectedDelivery,
        deliveries,
      });
    }

    return { success: true, projects: enriched };
  }

  async getProjectById(projectId, currentUser) {
    this.ensureRole(currentUser, [config.roles.SUPER_ADMIN, config.roles.ADMIN, config.roles.REVIEWER]);
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      return { success: false, error: 'Project not found' };
    }
    const deliveries = await this.deliveryRepo.findByProject(projectId);
    const expected = this.timelineService.getExpectedDeliveryNumber(project, deliveries);
    return { success: true, project: { ...project, deliveries, expectedDeliveryNumber: expected } };
  }

  async approveAnteproject(projectId, approvedDate, currentUser) {
    this.ensureRole(currentUser, [config.roles.SUPER_ADMIN, config.roles.ADMIN]);
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    const updates = this.timelineService.applyAnteprojectApproval(project, approvedDate);
    updates.approvedBy = project.registeredBy || this.getUserSignature(currentUser);
    const updated = await this.projectRepo.update(projectId, updates);
    return { success: true, project: updated };
  }

  generateProjectCode(studentId = '') {
    const normalized = (studentId || 'ST').toString().replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${normalized || 'PRJ'}-${Date.now().toString().slice(-4)}-${randomPart}`;
  }
}

module.exports = ProjectController;

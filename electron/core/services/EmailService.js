const nodemailer = require('nodemailer');
const emailConfig = require('../../config/email');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter(emailConfig.smtp);
    } catch (error) {
      console.error('Failed to initialize email transporter:', error);
    }
  }

  async sendEmail(to, subject, text, html = null) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: `"${emailConfig.from.name}" <${emailConfig.from.email}>`,
        to,
        subject,
        text,
        html: html || text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendProjectCreatedEmail(projectData, studentEmail) {
    const template = emailConfig.templates.projectCreated;
    const subject = template.subject.replace('{{projectName}}', projectData.name);
    const text = template.text.replace('{{projectName}}', projectData.name);

    return this.sendEmail(studentEmail, subject, text);
  }

  async sendDeliverySubmittedEmail(deliveryData, reviewerEmail) {
    const template = emailConfig.templates.deliverySubmitted;
    const subject = template.subject.replace('{{projectName}}', deliveryData.projectName);
    const text = template.text.replace('{{projectName}}', deliveryData.projectName);

    return this.sendEmail(reviewerEmail, subject, text);
  }

  async sendDeliveryApprovedEmail(deliveryData, studentEmail) {
    const template = emailConfig.templates.deliveryApproved;
    const subject = template.subject.replace('{{projectName}}', deliveryData.projectName);
    const text = template.text.replace('{{projectName}}', deliveryData.projectName);

    return this.sendEmail(studentEmail, subject, text);
  }

  async sendDeliveryRejectedEmail(deliveryData, studentEmail) {
    const template = emailConfig.templates.deliveryRejected;
    const subject = template.subject.replace('{{projectName}}', deliveryData.projectName);
    const text = template.text.replace('{{projectName}}', deliveryData.projectName);

    return this.sendEmail(studentEmail, subject, text);
  }

  async sendUserCreatedEmail(userData) {
    const template = emailConfig.templates.userCreated;
    const subject = template.subject;
    const text = template.text.replace('{{username}}', userData.username);

    return this.sendEmail(userData.email, subject, text);
  }
}

module.exports = EmailService;

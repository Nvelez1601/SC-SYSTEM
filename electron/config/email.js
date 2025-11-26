const config = {
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || '', // Your email address
      pass: process.env.SMTP_PASS || '', // Your email password or app password
    },
  },
  
  from: {
    name: 'USM Community Service Tracker',
    email: process.env.SMTP_FROM || '', // Sender email
  },
  
  templates: {
    projectCreated: {
      subject: 'New Project Created - {{projectName}}',
      text: 'A new community service project has been created: {{projectName}}',
    },
    deliverySubmitted: {
      subject: 'Delivery Submitted - {{projectName}}',
      text: 'A new delivery has been submitted for project: {{projectName}}',
    },
    deliveryApproved: {
      subject: 'Delivery Approved - {{projectName}}',
      text: 'Your delivery for project {{projectName}} has been approved.',
    },
    deliveryRejected: {
      subject: 'Delivery Rejected - {{projectName}}',
      text: 'Your delivery for project {{projectName}} has been rejected. Please review the feedback.',
    },
    userCreated: {
      subject: 'Welcome to USM Community Service Tracker',
      text: 'Your account has been created. Username: {{username}}',
    },
  },
};

module.exports = config;

# USM Community Service Tracker (USM-CST)

A centralized, digital system to automate the tracking, submission, and certification of community service projects for USM (Universidad Santa Maria).

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Running the Application](#running-the-application)
7. [Default Credentials](#default-credentials)
8. [Project Workflow](#project-workflow)
9. [Architecture](#architecture)
10. [Email Configuration](#email-configuration)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

USM-CST is an Electron-based desktop application designed to replace manual Excel and email processes for tracking community service projects. The system enforces a strict sequential workflow where students cannot start Delivery N+1 until Delivery N is approved.

### Key Features

- User Management (Super Admin, Admin, Reviewer, Student roles)
- Project Registration with automated 3-month timer
- Sequential Delivery Workflow
- Reviewer Dashboard
- Automated Email Notifications
- PDF/CSV Report Generation
- Clean Architecture with OOP principles

---

## Technology Stack

- **Frontend**: React 18, Tailwind CSS, React Router
- **Backend**: Electron 28, Node.js
- **Database**: NeDB (embedded NoSQL database)
- **Build Tool**: Vite 5
- **Email**: Nodemailer (SMTP)
- **Authentication**: bcryptjs

---

## Project Structure

```
SC-SYSTEM/
├── electron/                    # Electron main process (backend)
│   ├── main.js                 # Application entry point
│   ├── preload.js              # IPC bridge
│   ├── config/                 # Configuration files
│   │   ├── database.js         # Database configuration
│   │   └── email.js            # Email templates & SMTP config
│   ├── database/               # Database layer
│   │   ├── connection.js       # Database connection manager
│   │   └── repositories/       # Data access classes
│   │       ├── BaseRepository.js
│   │       ├── UserRepository.js
│   │       ├── ProjectRepository.js
│   │       └── DeliveryRepository.js
│   ├── core/                   # Business logic layer
│   │   ├── useCases/          # Use case classes
│   │   │   └── user/
│   │   │       ├── LoginUserUseCase.js
│   │   │       ├── CreateUserUseCase.js
│   │   │       └── GetAllUsersUseCase.js
│   │   └── services/          # Business services
│   │       └── EmailService.js
│   ├── controllers/           # Controller layer
│   │   └── UserController.js
│   └── ipc/                   # IPC handlers
│       └── handlers.js
│
├── src/                       # React frontend (renderer process)
│   ├── App.jsx                # Main application component
│   ├── main.jsx               # React entry point
│   ├── pages/                 # Page components
│   │   ├── Login.jsx
│   │   ├── SuperAdmin/
│   │   │   ├── Dashboard.jsx
│   │   │   └── UserManagement.jsx
│   │   └── Admin/
│   │       └── Dashboard.jsx
│   └── styles/                # CSS files
│       └── index.css
│
├── data/                      # Database files (auto-created)
├── package.json               # Dependencies
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
└── README.md                  # This file
```

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (optional, for version control)
- **WSL** (Windows Subsystem for Linux) - if on Windows

### Check if Node.js is installed:

```bash
node --version
npm --version
```

If not installed, download and install from [nodejs.org](https://nodejs.org/).

---

## Installation & Setup

Follow these steps to set up the project from scratch:

### Step 1: Open WSL Terminal

1. Open your terminal (WSL on Windows)
2. Navigate to your project directory:

```bash
cd "/mnt/c/Users/Nelson Velez/Desktop/SC-SYSTEM"
```

### Step 2: Install Dependencies

Install all required Node.js packages:

```bash
npm install
```

This will install:
- Electron and related tools
- React and React Router
- Tailwind CSS
- NeDB database
- Nodemailer for emails
- bcryptjs for password hashing
- All development dependencies

**Wait for the installation to complete.** This may take a few minutes depending on your internet connection.

### Step 3: Verify Installation

Check if all packages were installed correctly:

```bash
npm list --depth=0
```

You should see all the packages listed without errors.

---

## Running the Application

### Development Mode

To run the application in development mode with hot-reload:

```bash
npm run dev
```

This command will:
1. Start the Vite development server (React frontend) on `http://localhost:5173`
2. Launch the Electron application
3. Open DevTools automatically for debugging

**The application window should open automatically.**

### What Happens on First Run

1. The `data/` folder is created automatically
2. Database files are initialized:
   - `users.db`
   - `projects.db`
   - `deliveries.db`
   - `notifications.db`
3. A Super Admin user is automatically created with default credentials

---

## Importing Excel Data

The application supports importing the university's Excel file as the source of projects and deliveries. The importer creates projects (if missing) and delivery records, and stores an import history for auditing.

Usage (UI):
- Log in as **Super Admin** or **Admin**.
- Open the sidebar and go to **Projects → Import**.
- Select the `.xlsx` file exported by the university and click **Importar**.
- After the import completes you will see a visual confirmation and the import summary (projects created, deliveries created, errors). A chronological import history is shown below with options to refresh or clear the log.

Usage (CLI):
- You can run the importer directly from the project root (useful for automated imports):

```bash
node electron/scripts/runImportCli.js "C:\ruta\a\tu_archivo.xlsx"
```

Files created/used:
- `data/imports.db` — import history records (auto-created)
- `data/projects.db`, `data/deliveries.db` — projects and deliveries created/updated by the importer

---

## IPC Endpoints (Import)

These handlers live in the Electron main process (`electron/ipc/handlers.js`) and are exposed to the renderer via `electron/preload.js`.

- `project:importExcel` (args: `filePath`) — parses the Excel file, creates projects and deliveries, records an import entry; returns `{ success, results }` where `results` includes `createdProjects`, `createdDeliveries`, and `errors`.
- `project:getImportHistory` () — returns `{ success, imports }` with a list of past import records sorted by `importedAt` desc.
- `project:clearImportHistory` () — clears the imports log; returns `{ success, removed }`.

Preload (renderer API):
- `window.electronAPI.importExcel(filePath)` — invoke the import from UI.
- `window.electronAPI.getImportHistory()` — fetch import history for display.
- `window.electronAPI.clearImportHistory()` — clear saved import history.

Notes:
- The importer includes flexible column mapping for Spanish headers and tries to infer fields when headers are empty.
- Project codes are generated when missing to avoid uniqueness conflicts.


## Default Credentials

### Super Administrator Account

Use these credentials to log in for the first time:

- **Username**: `admin`
- **Password**: `eerVCWETxoJvRiMqiyf4`

**IMPORTANT**: This Super Admin account is created automatically on first run. It has full access to all system features.

---

## Project Workflow

### User Role Hierarchy

```
Super Administrator (Unique)
    ↓
Administrator (Multiple)
    ↓
Reviewer (Multiple)

```

### Sequential Delivery Workflow

1. **Project Registration**: Admin/Reviewer creates a project with a 3-month duration
2. **Delivery 1**: Student submits first delivery
3. **Review**: Reviewer approves or rejects Delivery 1
4. **Delivery 2**: Student can only submit after Delivery 1 is approved
5. **Repeat**: This continues for all subsequent deliveries
6. **Completion**: Project is marked complete after all deliveries are approved

### Email Notifications

Automated emails are sent for:
- User account creation
- Project creation
- Delivery submission
- Delivery approval
- Delivery rejection

---

## Architecture

The project follows Clean Architecture principles with clear separation of concerns:

### Layers

1. **Presentation Layer** (React UI)
   - User interface components
   - Pages and routing
   - State management

2. **Controller Layer** (Electron IPC)
   - Handles IPC communication
   - Routes requests to use cases
   - Returns responses to frontend

3. **Business Logic Layer** (Use Cases & Services)
   - Use Cases: Specific business operations
   - Services: Reusable business logic
   - Enforces business rules

4. **Data Access Layer** (Repositories)
   - Database operations
   - CRUD operations
   - Query abstraction

5. **Database Layer** (NeDB)
   - Embedded NoSQL database
   - File-based storage
   - No external database server needed

### Design Patterns Used

- **Singleton Pattern**: Database connection
- **Repository Pattern**: Data access abstraction
- **Use Case Pattern**: Business logic encapsulation
- **MVC Pattern**: Overall application structure

---

## Email Configuration

The application uses SMTP for sending emails. By default, it's configured for Gmail.

### To Configure Email:

1. Open `electron/config/email.js`
2. Update the SMTP settings:

```javascript
smtp: {
  host: 'smtp.gmail.com',        // Your SMTP host
  port: 587,                     // SMTP port
  secure: false,
  auth: {
    user: 'your-email@gmail.com',  // Your email
    pass: 'your-app-password',     // Your password or app password
  },
}
```

### For Gmail Users:

1. Enable 2-Factor Authentication in your Google Account
2. Generate an App Password: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Use the App Password in the configuration

### Environment Variables (Optional):

You can also use environment variables:

```bash
# Create a .env file in the root directory
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

**Note**: Email functionality is optional for development. The application will work without it, but emails won't be sent.

---

## Troubleshooting

### Issue: "npm: command not found"

**Solution**: Install Node.js from [nodejs.org](https://nodejs.org/)

### Issue: "Cannot find module 'electron'"

**Solution**: Run `npm install` to install all dependencies

### Issue: Electron window doesn't open

**Solution**: 
1. Check if port 5173 is available
2. Run `npm run dev` again
3. Check terminal for error messages

### Issue: Login fails with correct credentials

**Solution**: 
1. Delete the `data/` folder
2. Run the application again (Super Admin will be recreated)

### Issue: White screen on startup

**Solution**: 
1. Open DevTools (Ctrl+Shift+I or Cmd+Option+I)
2. Check for JavaScript errors in the console
3. Ensure Vite server is running on port 5173

### Issue: Database errors

**Solution**: 
1. Stop the application
2. Delete the `data/` folder
3. Restart the application

### Issue: Email not sending

**Solution**: 
1. Verify SMTP credentials in `electron/config/email.js`
2. Check your email provider's security settings
3. For Gmail, use an App Password instead of your regular password

---

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run dev:vite` | Start only Vite dev server (frontend) |
| `npm run dev:electron` | Start only Electron (backend) |
| `npm run build` | Build React app for production |
| `npm run preview` | Preview production build |

---

## Next Steps

After successfully running the application:

1. **Login** with the Super Admin credentials
2. **Create Users**: Add Administrators, Reviewers, and Students
3. **Configure Email**: Set up SMTP for notifications
4. **Test Workflow**: Create a test project and test the delivery workflow

---

## Support

For issues or questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review error messages in the terminal
- Check browser console for frontend errors (F12 or DevTools)

---

## Process Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USM-CST Workflow                         │
└─────────────────────────────────────────────────────────────┘

1. User Authentication
   ┌──────────┐
   │  Login   │ → Verify Credentials → Set User Session
   └──────────┘

2. User Management (Super Admin / Admin)
   ┌────────────────┐
   │ Create User    │ → Validate → Save to DB → Send Email
   └────────────────┘

3. Project Registration
   ┌────────────────┐
   │ Create Project │ → Set 3-month timer → Assign Student & Reviewer
   └────────────────┘

4. Delivery Workflow
   ┌─────────────────┐
   │ Submit Delivery │ → Check Previous Delivery Status
   └─────────────────┘
           ↓
   ┌─────────────────┐
   │ Review Delivery │ → Approve / Reject
   └─────────────────┘
           ↓
   If Approved → Student can submit next delivery
   If Rejected → Student must resubmit current delivery

5. Notifications
   ┌──────────────┐
   │ Send Email   │ → SMTP → Student / Reviewer
   └──────────────┘

6. Reporting
   ┌──────────────┐
   │ Generate PDF │ → Export data → Save report
   └──────────────┘
```

---

## License

MIT License - Feel free to use and modify for your needs.

---

**Built with ❤️ for USM Community Service Projects**

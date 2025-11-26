# Quick Start Guide - USM Community Service Tracker

## Step-by-Step Instructions to Run the Project

### 1. Open WSL Terminal
Open your WSL terminal and navigate to the project directory:

```bash
cd "/mnt/c/Users/Nelson Velez/Desktop/SC-SYSTEM"
```

### 2. Verify Installation
Check if dependencies are installed:

```bash
ls node_modules
```

If you see a list of folders, dependencies are installed correctly.

### 3. Run the Application

```bash
npm run dev
```

This will:
- Start the Vite development server on http://localhost:5173
- Launch the Electron application window
- Open with DevTools for debugging

### 4. Login to the Application

When the application window opens, use these credentials:

**Username**: `admin`  
**Password**: `eerVCWETxoJvRiMqiyf4`

### 5. What You Can Do Now

After logging in as Super Admin, you can:

1. **View Dashboard** - See system statistics
2. **Create Users** - Add Administrators, Reviewers, and Students
3. **Manage Users** - View, edit, or delete users

### Common Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the application in development mode |
| `Ctrl+C` | Stop the application |
| `npm run build` | Build the React app for production |

### Troubleshooting

**Application doesn't start?**
- Make sure you're in the correct directory
- Run `npm install` again if needed
- Check if port 5173 is available

**Can't login?**
- Use the exact credentials shown above
- Check for typing errors (password is case-sensitive)

**White screen?**
- Wait a few seconds for Vite to compile
- Check the terminal for error messages
- Press Ctrl+R to reload the window

### File Structure Overview

```
SC-SYSTEM/
├── electron/          # Backend code (Node.js + Electron)
├── src/               # Frontend code (React)
├── data/              # Database files (auto-created)
├── node_modules/      # Dependencies (auto-created)
├── package.json       # Project configuration
└── README.md          # Full documentation
```

### Next Steps

1. Read the full README.md for detailed information
2. Configure email settings in `electron/config/email.js`
3. Create test users and explore the system
4. Start building additional features

### Getting Help

- Check the full README.md for detailed documentation
- Look at error messages in the terminal
- Open DevTools in the app (Ctrl+Shift+I) to see frontend errors

---

**You're all set! Run `npm run dev` to start the application.**

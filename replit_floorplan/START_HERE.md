# 🚀 START HERE - Floorplan Wizard Local Setup

Welcome! This guide will help you run your Floorplan Wizard webapp locally on VS Code.

---

## 📖 Documentation Index

Choose the guide that best fits your needs:

### 🏃 **Quick Start** (5 minutes)
**File:** [QUICKSTART.md](./QUICKSTART.md)
- For experienced developers
- Minimal explanation
- Just the commands you need

### 📝 **Step-by-Step Guide** (15 minutes)
**File:** [STEP_BY_STEP.md](./STEP_BY_STEP.md)
- **👈 RECOMMENDED FOR BEGINNERS**
- Detailed instructions with screenshots descriptions
- Troubleshooting for common issues
- Perfect if this is your first time

### 📚 **Complete Documentation** (30 minutes)
**File:** [README.md](./README.md)
- Full project documentation
- Architecture overview
- All available commands
- Development tips and best practices

### 🔄 **Transition Guide** (20 minutes)
**File:** [LOCAL_SETUP.md](./LOCAL_SETUP.md)
- Detailed guide for moving from Replit to local
- Explains all changes made
- Differences between Replit and local development
- Production deployment information

### 📋 **Changes Summary** (5 minutes)
**File:** [SETUP_SUMMARY.md](./SETUP_SUMMARY.md)
- Quick overview of what was changed
- Technical details of modifications
- File structure overview

---

## ⚡ Super Quick Start

If you just want to get running NOW:

```powershell
# 1. Open terminal in project folder
cd c:\replit3\replit_floorplan

# 2. Install dependencies (first time only)
npm install

# 3. Start the server
npm run dev

# 4. Open browser to http://localhost:5173
```

That's it! 🎉

---

## 🎯 What You Need

### Required:
- ✅ **Node.js v20+** - [Download](https://nodejs.org/)
- ✅ **npm** (comes with Node.js)

### Recommended:
- ✅ **VS Code** - [Download](https://code.visualstudio.com/)
- ✅ **Git** (optional) - [Download](https://git-scm.com/)

### Check if you have them:
```powershell
node --version    # Should show v20.x.x or higher
npm --version     # Should show 9.x.x or higher
```

---

## 🛠️ What Was Changed?

Your project has been configured for local development:

1. ✅ **Added cross-env** - For Windows compatibility
2. ✅ **Updated npm scripts** - To work on all platforms
3. ✅ **Created documentation** - Comprehensive guides
4. ✅ **Added VS Code config** - Better development experience
5. ✅ **Created helper scripts** - Easy setup and running

**No code changes needed!** Your app code works perfectly as-is.

---

## 📁 Helper Scripts

### Windows Users:

**Automated Setup:**
```powershell
.\setup.ps1
```
Checks prerequisites and installs dependencies automatically.

**Quick Start:**
Double-click `start-dev.bat` to start the dev server (after initial setup).

### All Platforms:

```bash
npm install    # Install dependencies (first time)
npm run dev    # Start development server
npm run check  # Check for TypeScript errors
npm run build  # Build for production
npm start      # Run production build
```

---

## 🎓 Learning Path

### If you're new to web development:
1. Read [STEP_BY_STEP.md](./STEP_BY_STEP.md) first
2. Get the app running
3. Then read [README.md](./README.md) to understand the project
4. Explore the code in `client/src/`

### If you're experienced:
1. Read [QUICKSTART.md](./QUICKSTART.md)
2. Run `npm install && npm run dev`
3. Check [README.md](./README.md) for architecture details
4. Start coding!

### If you want to understand the changes:
1. Read [SETUP_SUMMARY.md](./SETUP_SUMMARY.md)
2. Check [LOCAL_SETUP.md](./LOCAL_SETUP.md) for details
3. Review the modified `package.json`

---

## 🏗️ Project Structure

```
replit_floorplan/
│
├── 📖 Documentation
│   ├── START_HERE.md          ← You are here!
│   ├── QUICKSTART.md          ← Fast setup
│   ├── STEP_BY_STEP.md        ← Detailed guide
│   ├── README.md              ← Full documentation
│   ├── LOCAL_SETUP.md         ← Transition guide
│   └── SETUP_SUMMARY.md       ← Changes summary
│
├── 🚀 Helper Scripts
│   ├── setup.ps1              ← Windows setup script
│   └── start-dev.bat          ← Quick start (Windows)
│
├── 💻 Source Code
│   ├── client/                ← Frontend (React)
│   ├── server/                ← Backend (Express)
│   └── shared/                ← Shared types
│
├── ⚙️ Configuration
│   ├── .vscode/               ← VS Code settings
│   ├── package.json           ← Dependencies
│   ├── vite.config.ts         ← Vite config
│   ├── tsconfig.json          ← TypeScript config
│   └── tailwind.config.ts     ← Tailwind config
│
└── 🔧 Environment
    └── .env.example           ← Environment template
```

---

## 🎯 Common Tasks

### First Time Setup:
```powershell
cd c:\replit3\replit_floorplan
npm install
npm run dev
# Open http://localhost:5173
```

### Daily Development:
```powershell
npm run dev
# Make changes, save files, see updates instantly
```

### Before Committing:
```powershell
npm run check    # Check for TypeScript errors
npm run build    # Ensure it builds successfully
```

### Troubleshooting:
```powershell
# Clean reinstall
rm -rf node_modules package-lock.json
npm install

# Check for errors
npm run check

# Clear Vite cache
rm -rf node_modules/.vite
```

---

## 🆘 Getting Help

### Quick Fixes:

**"npm: command not found"**
→ Install Node.js from https://nodejs.org/

**"Port already in use"**
→ Kill the process or use: `npm run dev -- --port 3000`

**"Cannot find module"**
→ Run: `npm install`

**"Changes not showing"**
→ Hard refresh: `Ctrl + Shift + R`

### Detailed Help:

- Check [STEP_BY_STEP.md](./STEP_BY_STEP.md) troubleshooting section
- Check [README.md](./README.md) troubleshooting section
- Look at browser console (F12) for frontend errors
- Look at terminal for backend errors

---

## 🎉 Success Checklist

You'll know everything is working when:

- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts both servers
- [ ] Terminal shows "ready in xxx ms"
- [ ] Browser opens http://localhost:5173
- [ ] You see the Floorplan Wizard interface
- [ ] No red errors in browser console (F12)
- [ ] Making changes to files updates the browser

---

## 🚀 Next Steps

Once you're up and running:

1. **Explore the code:**
   - Start with `client/src/main.tsx`
   - Check out `client/src/pages/`
   - Review `server/routes.ts`

2. **Make changes:**
   - Edit any file
   - Save (Ctrl + S)
   - See changes instantly in browser

3. **Learn the architecture:**
   - Read [README.md](./README.md)
   - Understand the wizard flow
   - Explore the export engine

4. **Customize:**
   - Modify UI components
   - Add new features
   - Adjust styling

---

## 💡 Pro Tips

1. **Use VS Code extensions** - Install recommended extensions for better experience
2. **Keep terminal visible** - Watch for errors and logs
3. **Use browser DevTools** - Press F12 to debug
4. **Save frequently** - Changes auto-reload with HMR
5. **Run type checking** - Use `npm run check` regularly

---

## 📞 Support

If you're stuck:

1. Check the troubleshooting sections in the guides
2. Verify Node.js and npm versions
3. Try a clean reinstall (`rm -rf node_modules && npm install`)
4. Check browser console and terminal for specific errors
5. Search for the error message online

---

## 🎊 Ready to Start?

Choose your path:

- **Beginner?** → Read [STEP_BY_STEP.md](./STEP_BY_STEP.md)
- **Experienced?** → Read [QUICKSTART.md](./QUICKSTART.md)
- **Want details?** → Read [README.md](./README.md)

Or just run:
```powershell
npm install && npm run dev
```

Happy coding! 🚀

---

**Last Updated:** 2025-10-30
**Project:** Floorplan Wizard
**Version:** 1.0.0


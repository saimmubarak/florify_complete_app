# Commands Reference - Quick Cheat Sheet

Quick reference for all commands you'll need while developing the Floorplan Wizard.

---

## 🚀 Essential Commands

### First Time Setup
```bash
# Navigate to project
cd c:\replit3\replit_floorplan

# Install all dependencies
npm install
```

### Start Development
```bash
# Start dev server (frontend + backend)
npm run dev

# Then open: http://localhost:5173
```

### Stop Development
```
Press: Ctrl + C
Type: Y (if prompted)
```

---

## 📦 Package Management

### Install Dependencies
```bash
# Install all packages from package.json
npm install

# Install a specific package
npm install <package-name>

# Install as dev dependency
npm install --save-dev <package-name>
```

### Update Dependencies
```bash
# Update all packages
npm update

# Update specific package
npm update <package-name>
```

### Remove Dependencies
```bash
# Uninstall a package
npm uninstall <package-name>
```

---

## 🛠️ Development Commands

### Run Development Server
```bash
npm run dev
```
- Starts frontend on port 5173
- Starts backend on port 5000
- Enables hot module replacement (HMR)
- Auto-restarts on file changes

### Type Checking
```bash
npm run check
```
- Runs TypeScript compiler
- Checks for type errors
- Doesn't emit files

### Build for Production
```bash
npm run build
```
- Builds frontend to `dist/public/`
- Bundles backend to `dist/index.js`
- Optimizes for production

### Run Production Build
```bash
npm start
```
- Runs the production build
- Serves on port 5000
- No hot reload

---

## 🔍 Debugging Commands

### Check Node.js Version
```bash
node --version
```

### Check npm Version
```bash
npm --version
```

### List Installed Packages
```bash
npm list
```

### Check for Outdated Packages
```bash
npm outdated
```

### View Package Info
```bash
npm info <package-name>
```

---

## 🧹 Cleanup Commands

### Clear npm Cache
```bash
npm cache clean --force
```

### Remove node_modules
```bash
# Windows PowerShell
rm -r -force node_modules

# Windows Command Prompt
rmdir /s /q node_modules

# Mac/Linux
rm -rf node_modules
```

### Clean Reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

### Clear Vite Cache
```bash
rm -rf node_modules/.vite
```

---

## 🌐 Port Management (Windows)

### Find Process Using Port
```powershell
# Find process on port 5173
netstat -ano | findstr :5173

# Find process on port 5000
netstat -ano | findstr :5000
```

### Kill Process by PID
```powershell
taskkill /PID <PID_NUMBER> /F
```

### Run on Different Port
```bash
# Run Vite on port 3000 instead of 5173
npm run dev -- --port 3000
```

---

## 📝 Git Commands (Optional)

### Initialize Git
```bash
git init
```

### Check Status
```bash
git status
```

### Stage Changes
```bash
# Stage all changes
git add .

# Stage specific file
git add <filename>
```

### Commit Changes
```bash
git commit -m "Your commit message"
```

### View Commit History
```bash
git log
```

### Create Branch
```bash
git checkout -b <branch-name>
```

### Switch Branch
```bash
git checkout <branch-name>
```

---

## 🔧 VS Code Commands

### Open Project in VS Code
```bash
code .
```

### Open Specific File
```bash
code <filename>
```

### Open VS Code Settings
```
Ctrl + ,
```

### Command Palette
```
Ctrl + Shift + P
```

### Quick File Open
```
Ctrl + P
```

### Toggle Terminal
```
Ctrl + `
```

### Toggle Sidebar
```
Ctrl + B
```

### Format Document
```
Shift + Alt + F
```

---

## 🐛 Troubleshooting Commands

### Check if Port is in Use
```powershell
netstat -ano | findstr :<PORT_NUMBER>
```

### Test Backend API
```bash
# Using curl (if installed)
curl http://localhost:5000/api/health

# Or open in browser
start http://localhost:5000/api/health
```

### Check Environment Variables
```powershell
# Windows PowerShell
$env:NODE_ENV

# Windows Command Prompt
echo %NODE_ENV%
```

### Set Environment Variable (Temporary)
```powershell
# Windows PowerShell
$env:NODE_ENV = "development"

# Windows Command Prompt
set NODE_ENV=development
```

---

## 📊 Performance Commands

### Analyze Bundle Size
```bash
npm run build
# Check dist/public folder size
```

### Check Disk Space
```powershell
# Windows
Get-PSDrive C
```

### Monitor Memory Usage
```
Open Task Manager: Ctrl + Shift + Esc
Look for Node.js processes
```

---

## 🎯 Common Workflows

### Daily Development
```bash
# 1. Start development
npm run dev

# 2. Make changes to files
# 3. Save files (Ctrl + S)
# 4. Browser auto-reloads

# 5. When done
Ctrl + C
```

### Before Committing
```bash
# 1. Check for TypeScript errors
npm run check

# 2. Build to ensure no build errors
npm run build

# 3. If all good, commit
git add .
git commit -m "Your message"
```

### Fixing Issues
```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Clear caches
npm cache clean --force
rm -rf node_modules/.vite

# 3. Restart dev server
npm run dev
```

### Updating Project
```bash
# 1. Pull latest changes (if using Git)
git pull

# 2. Install any new dependencies
npm install

# 3. Restart dev server
npm run dev
```

---

## 🔗 Useful URLs

### Development
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- API Health Check: http://localhost:5000/api/health

### Documentation
- Node.js: https://nodejs.org/docs
- npm: https://docs.npmjs.com
- Vite: https://vitejs.dev
- React: https://react.dev
- TypeScript: https://www.typescriptlang.org/docs

---

## 💡 Pro Tips

### Keyboard Shortcuts
```
Ctrl + C          Stop server
Ctrl + `          Toggle terminal
Ctrl + P          Quick file open
Ctrl + Shift + P  Command palette
Ctrl + B          Toggle sidebar
F12               Browser DevTools
Ctrl + Shift + R  Hard refresh browser
```

### Aliases (Optional)
Add to your PowerShell profile:
```powershell
# Create aliases for common commands
Set-Alias -Name dev -Value "npm run dev"
Set-Alias -Name build -Value "npm run build"
Set-Alias -Name check -Value "npm run check"
```

---

## 📚 Quick Reference

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Start dev server | `npm run dev` |
| Stop server | `Ctrl + C` |
| Type check | `npm run check` |
| Build for production | `npm run build` |
| Run production | `npm start` |
| Clean install | `rm -rf node_modules && npm install` |
| Clear cache | `npm cache clean --force` |
| Kill port 5173 | `netstat -ano \| findstr :5173` then `taskkill /PID <PID> /F` |

---

## 🆘 Emergency Commands

### Server Won't Start
```bash
# 1. Kill all Node processes
taskkill /F /IM node.exe

# 2. Clean reinstall
rm -rf node_modules package-lock.json
npm install

# 3. Try again
npm run dev
```

### Port Already in Use
```powershell
# Find and kill process
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use different port
npm run dev -- --port 3000
```

### Module Not Found
```bash
# Reinstall dependencies
npm install

# If still failing, clean install
rm -rf node_modules package-lock.json
npm install
```

---

**Keep this file handy for quick reference!** 📌

Print it out or bookmark it in your browser for easy access.


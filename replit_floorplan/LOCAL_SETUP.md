# Local Setup Guide - From Replit to VS Code

This guide will help you transition your Floorplan Wizard webapp from Replit to running locally on your machine with VS Code.

## What Changed?

The following changes were made to make the project work locally:

1. ✅ Added `cross-env` package for cross-platform environment variable support (Windows/Mac/Linux)
2. ✅ Updated npm scripts to use `cross-env` instead of Unix-style environment variables
3. ✅ Vite config already handles Replit-specific plugins conditionally (no changes needed)
4. ✅ Added VS Code configuration files for better development experience
5. ✅ Created comprehensive documentation and setup scripts

## Prerequisites

### Required Software

1. **Node.js (v20.x or higher)**
   - Download: https://nodejs.org/
   - Choose the LTS (Long Term Support) version
   - This includes npm (Node Package Manager)

2. **VS Code**
   - Download: https://code.visualstudio.com/
   - Recommended but not required (you can use any code editor)

3. **Git** (optional, for version control)
   - Download: https://git-scm.com/

### Verify Installation

Open PowerShell or Command Prompt and run:

```powershell
node --version
# Should output: v20.x.x or higher

npm --version
# Should output: 9.x.x or higher
```

## Setup Methods

Choose one of the following methods:

### Method 1: Automated Setup (Recommended for Windows)

1. Open PowerShell in the project directory:
   ```powershell
   cd c:\replit3\replit_floorplan
   ```

2. Run the setup script:
   ```powershell
   .\setup.ps1
   ```

3. Follow the on-screen instructions

### Method 2: Manual Setup (All Platforms)

#### Step 1: Open Project in VS Code

```bash
cd c:\replit3\replit_floorplan
code .
```

Or:
- Open VS Code
- File → Open Folder
- Navigate to `c:\replit3\replit_floorplan`

#### Step 2: Install Dependencies

Open the integrated terminal in VS Code (`` Ctrl + ` ``) and run:

```bash
npm install
```

This will:
- Install all project dependencies
- Install the new `cross-env` package
- Set up the project for local development

**Expected output:**
```
added XXX packages in XXs
```

#### Step 3: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help

Server running on http://localhost:5000
```

#### Step 4: Open in Browser

Navigate to: **http://localhost:5173**

## Understanding the Architecture

### Ports

- **Frontend (Vite Dev Server)**: Port 5173
  - Serves the React application
  - Hot Module Replacement (HMR) enabled
  - Proxies API requests to backend

- **Backend (Express Server)**: Port 5000
  - REST API endpoints
  - In-memory storage
  - Export engine for PDF/PNG

### Development Workflow

```
Browser (localhost:5173)
    ↓
Vite Dev Server (HMR, React)
    ↓
Express Backend (localhost:5000)
    ↓
In-Memory Storage
```

## VS Code Setup

### Recommended Extensions

When you open the project, VS Code will suggest installing recommended extensions. Click "Install All" or install them manually:

1. **ESLint** - Code linting
2. **Prettier** - Code formatting
3. **Tailwind CSS IntelliSense** - Tailwind class autocomplete
4. **ES7+ React/Redux snippets** - React code snippets
5. **TypeScript Vue Plugin** - Enhanced TypeScript support

### Keyboard Shortcuts

- `` Ctrl + ` `` - Toggle integrated terminal
- `Ctrl + P` - Quick file open
- `Ctrl + Shift + P` - Command palette
- `F5` - Start debugging
- `Ctrl + B` - Toggle sidebar

## Project Structure

```
replit_floorplan/
├── client/                    # Frontend React app
│   ├── src/
│   │   ├── components/       # UI components
│   │   │   ├── ui/          # Shadcn UI components
│   │   │   └── ...          # Custom components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities
│   │   ├── pages/           # Page components
│   │   └── main.tsx         # App entry point
│   ├── public/              # Static assets
│   └── index.html           # HTML template
│
├── server/                   # Backend Express server
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API routes
│   ├── storage.ts          # In-memory storage
│   ├── export-engine.ts    # PDF/PNG export
│   ├── transform-math.ts   # Coordinate transforms
│   └── vite.ts             # Vite integration
│
├── shared/                  # Shared code
│   └── schema.ts           # TypeScript types
│
├── .vscode/                # VS Code settings
├── package.json            # Dependencies
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript config
├── tailwind.config.ts     # Tailwind config
└── README.md              # Documentation
```

## Available Commands

```bash
# Development
npm run dev          # Start dev server (frontend + backend)
npm run check        # Run TypeScript type checking

# Production
npm run build        # Build for production
npm start            # Run production server

# Database (future)
npm run db:push      # Push schema to database
```

## Environment Variables

Create a `.env` file in the root directory (optional):

```env
PORT=5000
NODE_ENV=development
```

The `.env.example` file is provided as a template.

## Troubleshooting

### Issue: "cross-env: command not found"

**Solution:**
```bash
npm install
```

### Issue: Port already in use

**Solution:**
```bash
# Windows PowerShell - Find process using port
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or change the port
npm run dev -- --port 3000
```

### Issue: Module not found errors

**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Issue: TypeScript errors in VS Code

**Solution:**
1. Press `Ctrl + Shift + P`
2. Type: "TypeScript: Restart TS Server"
3. Or: "TypeScript: Select TypeScript Version" → "Use Workspace Version"

### Issue: Changes not reflecting in browser

**Solution:**
1. Check if dev server is running
2. Hard refresh browser: `Ctrl + Shift + R`
3. Clear browser cache
4. Restart dev server

### Issue: Vite build fails

**Solution:**
```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## Differences from Replit

| Feature | Replit | Local (VS Code) |
|---------|--------|-----------------|
| Environment Variables | Set in Replit UI | Use `.env` file or `cross-env` |
| Port Configuration | `.replit` file | `vite.config.ts` and server code |
| File System | Replit FS | Local file system |
| Hot Reload | Built-in | Vite HMR |
| Database | Replit DB | In-memory (PostgreSQL ready) |
| Deployment | Replit hosting | Manual deployment needed |

## Next Steps

1. ✅ **Explore the codebase**
   - Start with `client/src/main.tsx`
   - Check out the wizard flow in `client/src/pages`
   - Review API routes in `server/routes.ts`

2. ✅ **Make changes**
   - Edit any file and save
   - Browser will auto-reload
   - Check terminal for errors

3. ✅ **Test your changes**
   - Use the app in the browser
   - Check browser console (F12) for errors
   - Monitor terminal for server logs

4. ✅ **Build for production**
   ```bash
   npm run build
   npm start
   ```

## Getting Help

- 📖 Read the [README.md](./README.md) for detailed documentation
- 🚀 Check [QUICKSTART.md](./QUICKSTART.md) for quick reference
- 🔍 Search for error messages online
- 💬 Check the browser console and terminal for error details

## Tips for Success

1. **Keep the terminal open** - Watch for errors and logs
2. **Use browser DevTools** - Press F12 to debug frontend issues
3. **Check both ports** - Frontend (5173) and Backend (5000)
4. **Save frequently** - HMR will update the browser automatically
5. **Run type checking** - Use `npm run check` to catch TypeScript errors
6. **Use VS Code extensions** - They make development much easier

## Production Deployment

When ready to deploy:

1. Build the project:
   ```bash
   npm run build
   ```

2. The `dist` folder will contain:
   - `dist/public/` - Frontend static files
   - `dist/index.js` - Backend server bundle

3. Deploy to your hosting provider:
   - Vercel, Netlify, Railway, Render, etc.
   - Serve `dist/public` as static files
   - Run `dist/index.js` as the Node.js server

## Summary

You're now set up to develop the Floorplan Wizard locally! The project is configured to work seamlessly on Windows, Mac, and Linux. All Replit-specific features are automatically disabled when running locally.

Happy coding! 🚀


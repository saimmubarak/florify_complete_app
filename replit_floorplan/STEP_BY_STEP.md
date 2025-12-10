# Step-by-Step Guide: Running Your Webapp Locally

Follow these steps exactly to get your Floorplan Wizard running on your local machine.

---

## 📋 Prerequisites Check

### Step 0: Verify Node.js Installation

Open **PowerShell** or **Command Prompt** and run:

```powershell
node --version
```

**Expected output:** `v20.x.x` or higher

If you see an error or version is lower than v20:
1. Go to https://nodejs.org/
2. Download the **LTS version** (Long Term Support)
3. Install it (use default settings)
4. Restart your terminal
5. Run `node --version` again

---

## 🚀 Setup Process

### Step 1: Open VS Code

1. Launch **Visual Studio Code**
2. Click **File** → **Open Folder**
3. Navigate to: `c:\replit3\replit_floorplan`
4. Click **Select Folder**

**Alternative:** Open terminal and run:
```powershell
cd c:\replit3\replit_floorplan
code .
```

---

### Step 2: Open Integrated Terminal

In VS Code:
- Press **Ctrl + `** (backtick key, usually below Esc)
- Or click **Terminal** → **New Terminal** from the menu

You should see a terminal panel at the bottom of VS Code.

---

### Step 3: Verify You're in the Right Directory

In the terminal, run:

```powershell
pwd
```

**Expected output:** `c:\replit3\replit_floorplan`

If not, navigate to the correct directory:
```powershell
cd c:\replit3\replit_floorplan
```

---

### Step 4: Install Dependencies

In the terminal, run:

```powershell
npm install
```

**What happens:**
- Downloads and installs all required packages
- Takes 2-5 minutes depending on internet speed
- You'll see a progress bar and package names scrolling

**Expected output (at the end):**
```
added XXX packages, and audited XXX packages in XXs

XX packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

**⚠️ If you see errors:**
- Check your internet connection
- Try running: `npm cache clean --force`
- Then run `npm install` again

---

### Step 5: Start the Development Server

In the terminal, run:

```powershell
npm run dev
```

**What happens:**
- Starts the backend Express server (port 5000)
- Starts the frontend Vite dev server (port 5173)
- Compiles TypeScript code
- Opens development mode with hot reload

**Expected output:**
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help

Server running on http://localhost:5000
```

**✅ Success indicators:**
- No red error messages
- You see "ready in xxx ms"
- Both URLs are shown (5173 and 5000)

---

### Step 6: Open in Browser

1. Open your web browser (Chrome, Edge, Firefox, etc.)
2. Navigate to: **http://localhost:5173**
3. You should see the Floorplan Wizard application!

**Alternative:** In VS Code terminal, **Ctrl + Click** on the `http://localhost:5173` link

---

## ✅ Verification

### You should see:

1. **In VS Code Terminal:**
   - Server running messages
   - No red error messages
   - Logs showing requests when you interact with the app

2. **In Browser:**
   - The Floorplan Wizard interface
   - No error messages
   - Interactive UI elements

3. **Browser Console (F12):**
   - No red errors
   - Maybe some info/log messages (that's normal)

---

## 🎯 Making Changes

### To edit the frontend:

1. Open any file in `client/src/`
2. Make your changes
3. Save the file (Ctrl + S)
4. **Browser automatically reloads** with your changes!

### To edit the backend:

1. Open any file in `server/`
2. Make your changes
3. Save the file (Ctrl + S)
4. Server automatically restarts
5. Refresh browser to see changes

---

## 🛑 Stopping the Server

When you're done developing:

1. Go to the VS Code terminal where the server is running
2. Press **Ctrl + C**
3. If prompted, type **Y** and press Enter

The server will stop, and you'll return to the command prompt.

---

## 🔄 Restarting the Server

To start again later:

1. Open VS Code in the project folder
2. Open terminal (Ctrl + `)
3. Run: `npm run dev`
4. Open browser to http://localhost:5173

---

## 📊 Understanding What's Running

```
┌─────────────────────────────────────────┐
│  Browser (http://localhost:5173)       │
│  - React Application                    │
│  - User Interface                       │
│  - Hot Module Replacement (HMR)        │
└─────────────────┬───────────────────────┘
                  │
                  │ API Requests
                  ↓
┌─────────────────────────────────────────┐
│  Vite Dev Server (Port 5173)           │
│  - Serves React app                     │
│  - Hot reload on file changes          │
│  - Proxies API calls to backend        │
└─────────────────┬───────────────────────┘
                  │
                  │ Proxy
                  ↓
┌─────────────────────────────────────────┐
│  Express Server (Port 5000)            │
│  - REST API endpoints                   │
│  - Business logic                       │
│  - In-memory storage                    │
│  - Export engine (PDF/PNG)             │
└─────────────────────────────────────────┘
```

---

## 🐛 Troubleshooting

### Problem: "npm: command not found"

**Solution:** Node.js is not installed or not in PATH
1. Install Node.js from https://nodejs.org/
2. Restart your terminal
3. Try again

---

### Problem: "Port 5173 is already in use"

**Solution:** Another app is using the port

**Option 1 - Kill the process:**
```powershell
netstat -ano | findstr :5173
taskkill /PID <PID_NUMBER> /F
```

**Option 2 - Use a different port:**
```powershell
npm run dev -- --port 3000
```
Then open http://localhost:3000

---

### Problem: "Cannot find module 'cross-env'"

**Solution:** Dependencies not installed
```powershell
npm install
```

---

### Problem: Browser shows "Cannot GET /"

**Solution:** Backend server not running
1. Check terminal for errors
2. Make sure you see "Server running on http://localhost:5000"
3. If not, restart with `npm run dev`

---

### Problem: Changes not showing in browser

**Solution:**
1. Check if dev server is still running (look at terminal)
2. Hard refresh browser: **Ctrl + Shift + R**
3. Clear browser cache
4. Restart dev server (Ctrl + C, then `npm run dev`)

---

### Problem: TypeScript errors in VS Code

**Solution:**
1. Press **Ctrl + Shift + P**
2. Type: "TypeScript: Restart TS Server"
3. Press Enter

---

### Problem: Many red squiggly lines in VS Code

**Solution:** Install recommended extensions
1. Look for a popup in VS Code asking to install recommended extensions
2. Click "Install All"
3. Or manually install:
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense

---

## 📚 Next Steps

### Learn the codebase:

1. **Start here:** `client/src/main.tsx` - App entry point
2. **Then check:** `client/src/pages/` - Page components
3. **Explore:** `client/src/components/` - UI components
4. **Backend:** `server/routes.ts` - API endpoints

### Useful commands:

```powershell
# Check for TypeScript errors
npm run check

# Build for production
npm run build

# Run production build
npm start
```

---

## 🎉 Success!

If you've made it here and your app is running, congratulations! You've successfully set up your Floorplan Wizard for local development.

### What you can do now:

✅ Edit code and see changes instantly
✅ Debug with browser DevTools (F12)
✅ Use VS Code debugging features
✅ Install VS Code extensions for better DX
✅ Commit changes to Git
✅ Deploy to production when ready

---

## 📖 Additional Documentation

- **README.md** - Full project documentation
- **QUICKSTART.md** - Quick reference guide
- **LOCAL_SETUP.md** - Detailed setup information
- **SETUP_SUMMARY.md** - Summary of changes made

---

## 💡 Pro Tips

1. **Keep terminal visible** - Watch for errors and logs
2. **Use browser DevTools** - Press F12 to debug
3. **Save frequently** - Changes auto-reload
4. **Check both ports** - Frontend (5173) and Backend (5000)
5. **Use VS Code extensions** - They make life easier!

---

Happy coding! 🚀


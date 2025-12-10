# Floorplan Wizard

A professional single-page React application for creating architectural floorplans through a guided wizard interface.

## Features

- **5-step wizard flow**: Plot Size → House Shape → Add Doors → Walls → Export/Save
- **Precision CAD tools**: Line, rectangle, polygon, freehand drawing with grid snapping
- **Professional export**: PNG/PDF at multiple DPI levels (96-600) with exact 0.25mm stroke rendering
- **Real-time measurements**: All dimensions displayed in feet with decimal precision

## Tech Stack

- **Frontend**: React + TypeScript, Vite, Wouter routing, TanStack Query, Shadcn UI
- **Backend**: Express.js with TypeScript, in-memory storage
- **Styling**: Tailwind CSS with Fluent Design + Apple HIG principles

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 20.x or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **VS Code** (recommended) - [Download here](https://code.visualstudio.com/)

To check if Node.js and npm are installed, run:
```bash
node --version
npm --version
```

## Local Setup Instructions

### Step 1: Navigate to the Project Directory

Open your terminal (PowerShell, Command Prompt, or VS Code integrated terminal) and navigate to the project folder:

```bash
cd c:\replit3\replit_floorplan
```

### Step 2: Install Dependencies

Install all required npm packages:

```bash
npm install
```

This will install all dependencies including the `cross-env` package needed for cross-platform environment variable support.

**Note**: If you see any warnings about optional dependencies or peer dependencies, you can safely ignore them.

### Step 3: Start the Development Server

Run the development server:

```bash
npm run dev
```

You should see output similar to:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help

Server running on http://localhost:5000
```

### Step 4: Open in Browser

Open your web browser and navigate to:
```
http://localhost:5173
```

The Vite dev server (frontend) runs on port **5173** by default, and the Express backend runs on port **5000**.

## Available Scripts

- **`npm run dev`** - Start the development server (both frontend and backend)
- **`npm run build`** - Build the application for production
- **`npm start`** - Start the production server (after building)
- **`npm run check`** - Run TypeScript type checking

## Project Structure

```
replit_floorplan/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions
│   │   └── pages/         # Page components
│   └── index.html
├── server/                # Backend Express server
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API routes
│   ├── storage.ts        # In-memory storage
│   ├── export-engine.ts  # PDF/PNG export logic
│   └── vite.ts           # Vite integration
├── shared/               # Shared types and schemas
│   └── schema.ts
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

## Development Tips

### VS Code Extensions (Recommended)

Install these VS Code extensions for the best development experience:

1. **ES7+ React/Redux/React-Native snippets** - Code snippets
2. **Tailwind CSS IntelliSense** - Tailwind class autocomplete
3. **TypeScript Vue Plugin (Volar)** - Better TypeScript support
4. **Prettier - Code formatter** - Code formatting
5. **ESLint** - Code linting

### Hot Module Replacement (HMR)

The development server supports Hot Module Replacement. Changes to your code will automatically reflect in the browser without a full page reload.

### Debugging

To debug in VS Code:

1. Set breakpoints in your code by clicking on the left margin of the line number
2. Press `F5` or go to Run → Start Debugging
3. Select "Node.js" as the environment

### Port Configuration

If ports 5173 or 5000 are already in use, you can change them:

- **Frontend (Vite)**: Add `--port 3000` to the dev script in `package.json`
- **Backend (Express)**: Set the `PORT` environment variable

## Troubleshooting

### Issue: "ENOTSUP: operation not supported on socket"

**Solution**: This was fixed in the server configuration. If you still see this error:
```bash
# Make sure you have the latest code
git pull  # if using git
npm install
npm run dev
```

The server now uses `localhost` instead of `0.0.0.0` for local development.

### Issue: "Cannot find module" errors

**Solution**: Delete `node_modules` and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port already in use

**Solution**: Kill the process using the port or change the port number:
```bash
# Windows PowerShell
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue: TypeScript errors

**Solution**: Run type checking to see all errors:
```bash
npm run check
```

### Issue: Vite build fails

**Solution**: Clear Vite cache and rebuild:
```bash
rm -rf node_modules/.vite
npm run dev
```

## Building for Production

To create a production build:

```bash
npm run build
```

This will:
1. Build the frontend React app to `dist/public`
2. Bundle the backend server to `dist/index.js`

To run the production build:

```bash
npm start
```

Then open `http://localhost:5000` in your browser.

## Environment Variables

The application uses the following environment variables:

- `NODE_ENV` - Set to `development` or `production`
- `PORT` - Server port (default: 5000)

You can create a `.env` file in the root directory to set these variables (optional).

## Database (Future)

The application currently uses in-memory storage. The project is configured for PostgreSQL migration using Drizzle ORM. See `drizzle.config.ts` for database configuration.

## Contributing

When making changes:

1. Create a new branch for your feature
2. Make your changes
3. Test thoroughly
4. Run `npm run check` to ensure no TypeScript errors
5. Commit your changes with clear messages

## License

MIT

## Support

For issues or questions, please check the existing documentation or create an issue in the project repository.


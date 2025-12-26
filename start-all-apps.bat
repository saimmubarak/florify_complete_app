@echo off
echo ========================================
echo Starting Florify Web App and Floorplan Builder
echo ========================================
echo.

:: Start Florify Frontend in a new window
echo Starting Florify Frontend on port 5173...
start "Florify Frontend" cmd /k "cd /d C:\florify_webapp\florify-frontend && npm run dev"

:: Wait a moment
timeout /t 2 /nobreak > nul

:: Start Replit Floorplan in a new window
echo Starting Floorplan Builder on port 5174...
start "Floorplan Builder" cmd /k "cd /d C:\florify_webapp\replit_floorplan && npm run dev"

echo.
echo ========================================
echo Both apps are starting in separate windows!
echo.
echo Florify Frontend: http://localhost:5173
echo Floorplan Builder: http://localhost:5001
echo ========================================
echo.
echo Press any key to close this window...
pause > nul


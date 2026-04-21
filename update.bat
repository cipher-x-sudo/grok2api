@echo off
echo ===================================================
echo   Updating Project: Pulling changes and rebuilding...
echo ===================================================
echo.

echo [1/3] Pulling latest changes from git...
git pull
echo.

echo [2/3] Stopping existing Docker containers...
docker-compose down
echo.

echo [3/3] Building and starting Docker containers...
docker-compose up -d --build
echo.

echo ===================================================
echo   Update Complete!
echo ===================================================
pause

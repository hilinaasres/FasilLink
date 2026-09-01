@echo off
setlocal enabledelayedexpansion

echo Starting FasilLink single-port deployment helper...

REM Always run relative to this script's folder
pushd "%~dp0"

REM 1) Build Frontend
echo ----------------------------
echo Building frontend (this may take a while)...
pushd "frontend"
if exist package-lock.json (
	echo Using npm lockfile
) else (
	echo No lockfile found
)
if exist node_modules\.cache (
	echo Removing stale frontend node_modules cache...
	rmdir /s /q node_modules\.cache
)
npm ci
if errorlevel 1 (
	echo npm ci failed, trying npm install instead...
	npm install
	if errorlevel 1 (
		echo Frontend install failed.
		popd
		pause
		exit /b 1
	)
)
npm run build
if errorlevel 1 (
	echo Frontend build failed.
	popd
	pause
	exit /b 1
)
popd

REM 2) Build Admin Dashboard
echo ----------------------------
echo Building admin-dashboard...
pushd "admin-dashboard"
if exist node_modules\.cache (
	echo Removing stale admin-dashboard node_modules cache...
	rmdir /s /q node_modules\.cache
)
npm ci
if errorlevel 1 (
	echo npm ci failed, trying npm install instead...
	npm install
	if errorlevel 1 (
		echo Admin install failed.
		popd
		pause
		exit /b 1
	)
)
npm run build
if errorlevel 1 (
	echo Admin build failed.
	popd
	pause
	exit /b 1
)
popd

REM 3) Start AI Recommendation Service (opens new window)
echo ----------------------------
echo Starting AI Recommendation Service...
pushd "ai-service"
start "AI Service" cmd /k "python -m pip install -r requirements.txt && python app.py"
popd

REM 4) Start Backend (opens new window)
echo ----------------------------
echo Starting Node.js Backend...
pushd "backend"
start "Backend" cmd /k "npm ci && npm run start"
popd

REM 5) Start ngrok tunnel for Chapa
echo ----------------------------
echo Starting ngrok tunnel...
start "ngrok" cmd /k "ngrok http 5000"

popd

echo All services started (frontend built, admin built, backend, AI, and ngrok running).
pause
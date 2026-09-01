# FasilLink — Single-port Deployment Guide

This repository (FasilLink) is configured so a single public port (the backend) can serve the built frontend, the admin UI, and proxy to the AI microservice. This README documents how to build, run, and deploy the project in development and production (systemd and PM2 examples included).

## Overview
- Public entrypoint: the Node.js `backend` service (default `PORT=5000`).
- Frontend: React app in `frontend/` (dev port 3000). Build output served by backend at `/`.
- Admin dashboard: Vite app in `admin-dashboard/` (dev port 3001). Build output served by backend under `/admin`.
- AI microservice: Flask app in `ai-service/` (default port 5001). Backend proxies requests from `/api/ai` to the AI service.

The backend acts as the single public port and reverse proxy for internal services.

## Environment variables
Set these in `backend/.env` (or your process manager / systemd unit):

- `PORT` — the public port for the backend (default `5000`).
- `AI_SERVICE_URL` — full URL of the AI service (default `http://localhost:5001`). Backend proxies `/api/ai` → this URL.
- `BACKEND_BASE_URL` — externally-facing backend URL (used by some services).
- `FRONTEND_BASE_URL` — externally-facing frontend URL (used by payment callbacks).
- `CHAPA_SECRET_KEY` — Chapa payment secret key (if used).
- Database and other secrets as currently present in `backend/.env` (copy/merge as appropriate).

Example `.env` snippet:

```
PORT=5000
AI_SERVICE_URL=http://localhost:5001
BACKEND_BASE_URL=http://localhost:5000
FRONTEND_BASE_URL=http://localhost:5000
CHAPA_SECRET_KEY=your-test-key-here
```

## Development (Windows)
The repository includes `start.bat` which builds the frontend and admin dashboard and opens separate consoles for the AI service and backend. To run locally on Windows:

1. Open PowerShell and run:

```powershell
.\start.bat
```

2. Visit `http://localhost:5000` for the main site and `http://localhost:5000/admin` for the admin UI (after builds complete).

Notes:
- While developing the React app, you may still run `frontend` with `npm start` (dev server on port 3000). The backend expects built static assets when acting as single-port host.

## Manual build steps (Linux / macOS)
From the repository root:

```bash
# Build frontend
cd frontend
npm ci
npm run build

# Build admin
cd ../admin-dashboard
npm ci
npm run build

# Prepare backend
cd ../backend
npm ci
# ensure backend/.env is created or environment vars set

# Start AI (Python venv recommended)
cd ../ai-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py  # default port 5001

# In another terminal: start backend
cd ../backend
npm run start

```

After the frontend and admin builds exist, the backend will serve them (frontend at `/`, admin at `/admin`). The backend proxies `/api/ai` to the AI service.

## Production suggestions
- Use a process manager (systemd, PM2) to run `backend` and `ai-service` as services.
- Use environment variables for secrets and service URLs; do not commit `.env` to source control.
- Terminate development servers (react-scripts/vite dev) and rely on the built static files for production.
- If you need TLS, deploy an edge reverse proxy (nginx, Caddy, cloud LB) in front of the backend (or terminate TLS at the cloud load balancer).

### Example systemd units
Create `/etc/systemd/system/fasil-backend.service`:

```
[Unit]
Description=FasilLink Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/FasilLink/backend
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=AI_SERVICE_URL=http://127.0.0.1:5001
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/fasil-ai.service`:

```
[Unit]
Description=FasilLink AI Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/FasilLink/ai-service
Environment=PYTHONUNBUFFERED=1
ExecStart=/path/to/venv/bin/python app.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

After creating unit files:

```bash
sudo systemctl daemon-reload
sudo systemctl enable fasil-backend fasil-ai
sudo systemctl start fasil-ai fasil-backend
sudo journalctl -u fasil-backend -f
```

Adjust `ExecStart` to point to your production Node.js output (e.g., compiled `dist` or `node` entry file). If you run Node via `npm run start`, you can use `ExecStart=/usr/bin/npm run start` but using `node` directly is recommended in production.

### PM2 ecosystem example
Create `ecosystem.config.js` at your deployment root:

```js
module.exports = {
  apps: [
    {
      name: 'fasil-ai',
      script: 'app.py',
      interpreter: '/path/to/venv/bin/python',
      cwd: '/path/to/FasilLink/ai-service',
      autorestart: true,
      watch: false,
      env: {
        PYTHONUNBUFFERED: '1'
      }
    },
    {
      name: 'fasil-backend',
      script: 'dist/server.js',
      cwd: '/path/to/FasilLink/backend',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        AI_SERVICE_URL: 'http://127.0.0.1:5001'
      }
    }
  ]
}
```

Start with PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # follow output to enable pm2 on boot
```

## Nginx (optional) — TLS termination and upstream
Example nginx snippet to terminate TLS and proxy to backend:

```
server {
  listen 80;
  server_name your.domain.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl;
  server_name your.domain.com;

  ssl_certificate /etc/letsencrypt/live/your.domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/your.domain.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Troubleshooting
- If admin UI does not load at `/admin`, confirm `admin-dashboard` build output exists (Vite default: `admin-dashboard/dist`). The backend expects the admin build folder at `admin-dashboard/dist`.
- If AI proxying fails, ensure `AI_SERVICE_URL` is reachable from the backend host and the AI service is running.
- Check backend logs and `journalctl` / PM2 logs for errors.

## Next steps I can help with
- Tailor the systemd units to your deployment paths.
- Create a `Dockerfile`/`docker-compose` for single-port production.
- Add an automated CI/CD pipeline example.

---

README created by the repository assistant. If you want, I can also generate the systemd unit files in the repo or a `Dockerfile` next.

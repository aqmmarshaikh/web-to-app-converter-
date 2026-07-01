# AppForge — Setup & Orchestration Guide

This guide details the step-by-step instructions to configure, run, and scale the production-hardened Website-to-APK Converter application.

---

## Prerequisites

1. **Docker Engine & Docker Compose (v2.x or later)**
2. **Node.js (v20+ or v22+) & npm** (for local development checks)
3. **Firebase Project** with Firestore and Authentication (Email/Password) enabled.

---

## 1. Firebase Service Account Setup

To allow the backend API to query Firestore collections and read/write configurations safely:
1. Navigate to the **Firebase Console** -> **Project Settings** -> **Service Accounts**.
2. Click **Generate New Private Key**, then download the `.json` file.
3. Rename the downloaded file to `firebase-adminsdk.json`.
4. Place the file inside the backend root folder:
   - `apps/backend/firebase-adminsdk.json`

---

## 2. Orchestration Setup via Docker Compose

All services (`frontend`, `backend`, `redis`, and the `worker`) can be spun up and scaled with a single command.

### Step 2.1: Clone and Configure Environment Files
Create a `.env` file in the root directory (based on `.env.example` in the root workspace):
```bash
cp .env.example .env
```
Fill in the exact Firebase client keys and project credentials in the root `.env` file.

### Step 2.2: Launch the Services
From the root workspace directory, build and launch the containerized application:
```bash
docker compose -f docker/docker-compose.yml up --build -d
```

This commands spins up:
* **appforge-redis** (Cache and build queues)
* **appforge-backend** (Express API server exposing `/health` and `/debug` endpoints)
* **appforge-worker** (Background processing queue listening for isolated build executions)
* **appforge-frontend** (Next.js client compiled with env variables embedded at build time)

---

## 3. Operations & Diagnostics

### Health Checks
- Access the health status of components directly using the API:
  - `GET http://localhost:4000/health`
  - Returns component health structures:
    ```json
    {
      "redis": true,
      "firebase": true,
      "database": true,
      "worker": true
    }
    ```

### Diagnostics Panel
- Access detailed checklist data on environmental configs and queue statistics:
  - `GET http://localhost:4000/debug`
- Access client-side live checks at:
  - `http://localhost:3000/debug`

---

## 4. Local Development Mode

If you prefer to run services individually without Docker Compose:

1. **Start Redis:**
   ```bash
   docker run -d -p 6379:6379 --name appforge-redis redis:alpine
   ```
2. **Start Backend & Worker:**
   ```bash
   npm run dev:backend
   # In another terminal:
   npm run worker --workspace=apps/backend
   ```
3. **Start Frontend:**
   ```bash
   npm run dev:frontend
   ```
4. Access the site locally at `http://localhost:3000/dashboard`.

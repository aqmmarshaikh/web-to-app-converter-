# AppForge

Convert any website into an Android application (APK or AAB) without writing code.

## Quick Start

### Prerequisites

- Node.js 20+
- Docker Desktop (for Android builds)
- PostgreSQL 16
- Redis 7

### Development Setup

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Start infrastructure services:**

```bash
docker compose -f docker/docker-compose.yml up -d
```

3. **Setup environment:**

```bash
cp .env.example .env
# Edit .env with your values
```

4. **Setup database:**

```bash
cd apps/backend
npx prisma db push
npx prisma generate
```

5. **Start development servers:**

```bash
# Terminal 1: Frontend
npm run dev:frontend

# Terminal 2: Backend
npm run dev:backend
```

6. **Open the app:**

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- API Health: http://localhost:4000/api/health

## Architecture

```
apps/
├── frontend/          # Next.js 15 + shadcn/ui + Tailwind CSS
├── backend/           # Express.js + Prisma + BullMQ
packages/
├── shared/            # Shared types & validation schemas
docker/
├── android-builder/   # Docker image with Android SDK
├── docker-compose.yml # Development infrastructure
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Express.js, TypeScript, Prisma ORM |
| Database | PostgreSQL 16 |
| Cache/Queue | Redis 7 + BullMQ |
| Build Engine | Docker + Android SDK + Gradle |
| Auth | JWT + bcrypt |
| Real-time | Socket.IO |

## License

MIT

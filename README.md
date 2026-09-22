# PushCloud - Automated Deployment Platform

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" />
</div>

## 📌 Overview

PushCloud is a **Vercel-inspired deployment platform** for building and publishing public GitHub projects. It provides a React dashboard where users can sign in with GitHub, submit a repository, follow build logs in real time, and open the resulting deployment URL.

The current implementation is an **MVP for local development and staging**. It uses a local Docker builder, Redis pub/sub, an S3-compatible object store, PostgreSQL through Prisma, Supabase authentication, and an Express reverse proxy. AWS ECS/Fargate orchestration is part of the original direction, but is not currently wired into the API.

### 🎯 Key Features

- ⚡ **GitHub deployments** - Deploy public GitHub repositories from the dashboard
- 🔐 **GitHub OAuth** - Authenticate through Supabase Auth
- 🐳 **Containerized builds** - Clone and build repositories inside the `builder-image` Docker container
- 📊 **Real-time logs** - Stream build output through Redis pub/sub and Socket.IO
- 🗃️ **Deployment persistence** - Store users, projects, deployments, statuses, and public URLs in PostgreSQL
- 🌐 **Local preview URLs** - Serve successful deployments through `<slug>.localhost:8000`
- 🔄 **S3-compatible storage** - Upload build artifacts under `__outputs/<slug>/`
- 🧭 **Project dashboard** - Browse projects and their recent deployment history

---

## 🏗️ Architecture

```text
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│              │       │                  │       │                  │
│ React/Vite   │──────▶│ Express API      │──────▶│ Docker builder   │
│ Frontend     │       │ + Auth + Prisma  │       │ container        │
│ :5173        │       │ :5000            │       │                  │
└──────┬───────┘       └────────┬─────────┘       └────────┬─────────┘
       │                        │                          │
       │ Socket.IO :9002        │ PostgreSQL               │ S3-compatible
       │                        │                          │ storage
       ▼                        ▼                          ▼
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ Live logs    │◀──────▶│ Redis pub/sub    │       │ Reverse proxy    │
│ and status   │       │ logs:* / status:*│       │ :8000            │
└──────────────┘       └──────────────────┘       └──────────────────┘
```

### Components

1. **Frontend** (`frontend/`)
   - Vite, React, React Router, and Tailwind CSS
   - GitHub sign-in through Supabase Auth
   - Protected deployment, dashboard, and deployment-detail screens
   - API requests authenticated with the current Supabase access token
   - Live build logs received through Socket.IO

2. **API server** (`api-server/`)
   - Express API on port `5000`
   - Supabase JWT verification
   - Prisma/PostgreSQL persistence
   - Public GitHub repository validation
   - Local Docker builder launch through `docker run`
   - Socket.IO server on port `9002`
   - Redis subscription for logs and deployment status events

3. **Build server** (`build-server/`)
   - Docker image for isolated repository builds
   - Clones a repository into `/home/app/output`
   - Detects Vite, Create React App, or plain static HTML projects
   - Runs the project build when required
   - Uploads output files to S3-compatible storage
   - Publishes logs and lifecycle statuses through Redis

4. **Reverse proxy** (`s3-reverse-proxy/`)
   - Express server on port `8000`
   - Converts `<slug>.localhost` requests into S3 object paths
   - Serves `/` as `index.html`
   - Reads deployment files from `__outputs/<slug>/`

5. **Database** (`api-server/prisma/`)
   - PostgreSQL schema managed with Prisma migrations
   - Stores `User`, `Project`, and `Deployment` records
   - Deployment statuses are `queued`, `building`, `uploading`, `ready`, `failed`, and `cancelled`
   - Build logs are currently streamed only and are not persisted

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- Docker Desktop or another Docker Engine
- Redis or a Redis-compatible service such as Upstash
- PostgreSQL, such as a Supabase database
- S3-compatible object storage, such as MinIO or Amazon S3
- A Supabase project with GitHub OAuth configured

The repository does not include Docker Compose, ECS task definitions, infrastructure scripts, Redis, MinIO, or PostgreSQL setup. Those services must be running separately.

### Install Dependencies

```bash
# API server
cd api-server
npm install

# Frontend
cd ../frontend
npm install

# Build worker dependencies are installed into the Docker image.
# Install them locally only when working directly on build-server/script.js.
cd ../build-server
npm install

# Reverse proxy
cd ../s3-reverse-proxy
npm install
```

### Configure Environment Variables

Create local `.env` files. Never commit them or expose their values in logs, screenshots, or documentation.

#### `api-server/.env`

```env
PORT=5000
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
REDIS_URL=redis://...
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# Values passed to the local Docker builder
S3_BUCKET=vercel
S3_ACCESS_KEY=your-storage-access-key
S3_SECRET_KEY=your-storage-secret-key
AWS_REGION=us-east-1
S3_ENDPOINT=http://host.docker.internal:9000
```

`DIRECT_URL` should be a direct PostgreSQL connection suitable for Prisma migrations. `DATABASE_URL` may use a pooler connection when supported by the database provider.

#### `frontend/.env`

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:9002
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### Build worker variables

The API passes these values into the builder container:

```env
GIT_REPOSITORY__URL=https://github.com/owner/repository
PROJECT_ID=deployment-public-slug
BUCKET_NAME=vercel
REDIS_URL=redis://...
AWS_REGION=us-east-1
S3_ENDPOINT=http://host.docker.internal:9000
ACCESS_KEY=your-storage-access-key
SECRET_KEY=your-storage-secret-key
S3_FORCE_PATH_STYLE=true
```

The reverse proxy currently has its S3 endpoint, bucket, region, and credentials defined directly in `s3-reverse-proxy/index.js`. Update those values for the storage service used by your local environment.

### Prepare the Database

```bash
cd api-server
npm run db:migrate
```

To inspect the database locally:

```bash
npm run db:studio
```

### Build the Worker Image

```bash
cd build-server
docker build -t builder-image .
```

The API currently expects this exact local image name when it starts a deployment.

### Start the Services

Run each service in a separate terminal:

```bash
# Terminal 1: API and Socket.IO
cd api-server
npm start

# Terminal 2: Frontend
cd frontend
npm run dev

# Terminal 3: Reverse proxy
cd s3-reverse-proxy
node index.js
```

The local services use these addresses:

- Frontend: `http://localhost:5173`
- API: `http://localhost:5000`
- Socket.IO: `http://localhost:9002`
- Reverse proxy: `http://localhost:8000`

---

## 🎮 Usage

1. Open `http://localhost:5173`.
2. Sign in with GitHub.
3. Paste a public GitHub repository URL.
4. Select **Deploy**.
5. Open the deployment detail page to watch logs and status updates.
6. When the deployment is ready, open its generated local URL: `http://<deployment-slug>.localhost:8000`.

Only public GitHub repository URLs are accepted. The current builder supports public repositories containing:

- Plain static HTML without a `package.json`
- Vite projects, uploaded from `dist/`
- Create React App projects, uploaded from `build/`

Repositories using other frameworks are reported as unsupported by the builder.

---

## 🔌 API Endpoints

All endpoints except `/health` require an `Authorization: Bearer <Supabase access token>` header.

### Health check

```http
GET /health
```

Response:

```json
{ "ok": true }
```

### Current user

```http
GET /me
```

Returns the synchronized local user record for the authenticated Supabase user.

### Create a deployment

```http
POST /deployments
Content-Type: application/json

{
  "gitUrl": "https://github.com/owner/repository"
}
```

The API validates the public GitHub repository, creates or reuses the project, creates a queued deployment, and starts the local Docker builder.

### Get a deployment

```http
GET /deployments/:id
```

Returns a deployment only when it belongs to the authenticated user.

### List projects

```http
GET /projects
```

### List project deployments

```http
GET /projects/:projectId/deployments
```

---

## 📡 Real-time Events

The API hosts Socket.IO on port `9002`. After connecting, the frontend subscribes to:

- `logs:<publicSlug>` for build output
- `status:<publicSlug>` for lifecycle events

The build worker publishes structured status messages such as:

```json
{
  "status": "ready",
  "publicUrl": "http://clever-lion-42.localhost:8000"
}
```

The API forwards messages to connected clients and persists status changes in PostgreSQL. Logs are not replayed after the build finishes or after the client disconnects.

---

## 🔧 How It Works

### Deployment Flow

1. The user signs in through Supabase GitHub OAuth.
2. The frontend sends an authenticated `POST /deployments` request.
3. The API validates the public GitHub URL through the GitHub API.
4. The authenticated user is synchronized into the local `users` table.
5. The API creates or finds a project and creates a queued deployment.
6. The API starts `builder-image` with `docker run`.
7. The worker clones the repository and detects its project type.
8. The worker runs the required build and publishes logs/status events through Redis.
9. The API relays events through Socket.IO and updates the deployment row.
10. The worker uploads the build output under `__outputs/<slug>/`.
11. The reverse proxy serves the uploaded files from the generated local URL.

---

## 📂 Project Structure

```text
vercel-clone/
├── api-server/
│   ├── index.js                  # Express API and Socket.IO server
│   ├── routes/projects.js        # Authenticated project/deployment routes
│   ├── middleware/auth.js        # Supabase JWT verification
│   ├── services/deployments.js   # Prisma deployment operations
│   ├── lib/github.js             # Public GitHub repository validation
│   ├── db/client.js              # Prisma client
│   └── prisma/                   # Schema and migrations
├── build-server/
│   ├── script.js                 # Clone, detect, build, upload, publish
│   ├── main.sh                   # Container entrypoint
│   ├── Dockerfile                # Builder image definition
│   └── package.json
├── frontend/
│   ├── src/pages/                # Landing, deploy, dashboard, details
│   ├── src/components/           # Shared UI and live terminal preview
│   ├── src/lib/                  # API client, Supabase client, session hook
│   └── package.json
├── s3-reverse-proxy/
│   ├── index.js                  # Local deployment file proxy
│   └── package.json
├── log-tester/                   # Small Socket.IO log testing utility
├── test-redis.js                 # Redis connectivity/publish test utility
├── task-brief.txt                # Development notes
└── README.md
```

---

## 🛠️ Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, Vite, React Router, Tailwind CSS, Lucide React |
| **Backend** | Node.js, Express.js, Prisma |
| **Authentication** | Supabase Auth, GitHub OAuth, JWT/JWKS verification |
| **Database** | PostgreSQL |
| **Real-time** | Socket.IO, Redis pub/sub, ioredis |
| **Builds** | Docker, Node.js, npm, Git |
| **Storage** | S3-compatible object storage, AWS SDK for JavaScript |
| **Proxy** | Express, MIME type detection |
| **Validation** | GitHub public repository API |

---

## 🔐 Security Considerations

- Keep every `.env` file outside version control.
- Rotate AWS, Redis, database, and Supabase secrets immediately if they have been exposed.
- Use least-privilege credentials for the database, object storage, and Redis.
- Keep public repository validation enabled.
- Add rate limiting before exposing the API publicly.
- Add build timeouts, cancellation, resource limits, and stronger isolation before accepting untrusted workloads at scale.
- Restrict CORS to the deployed frontend origin instead of using a wildcard.
- Review Docker privileges and the builder image before running arbitrary third-party code in production.

---

## 🚧 Current Limitations and Roadmap

- [ ] Replace local `docker run` with a production worker/orchestration service
- [ ] Add production deployment configuration for the API, worker, proxy, Redis, database, and object storage
- [ ] Support custom domains and production DNS instead of local `.localhost` URLs
- [ ] Add private repositories and repository provider integrations
- [ ] Add Next.js, Vue, Angular, monorepo, and custom build-command support
- [ ] Add build timeouts, cancellation, retries, and resource limits
- [ ] Add build caching and deployment cleanup
- [ ] Persist and replay build logs
- [ ] Add deployment rollback and preview deployments
- [ ] Add environment variable management
- [ ] Add build analytics and usage limits
- [ ] Add automated tests and CI checks

---

## 🧪 Validation

The frontend production bundle can be built with:

```bash
cd frontend
npm run build
```

The project currently has no meaningful automated test suite. The API and worker package test scripts are placeholders, so a full authenticated deployment should be tested manually against running Redis, PostgreSQL, object storage, Docker, Supabase, and GitHub services.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make and test your changes
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## 👨‍💻 Author

**Shivam Juyal**

- GitHub: [@ShivamJuyal24](https://github.com/ShivamJuyal24)
- LinkedIn: [Shivam Juyal](https://www.linkedin.com/in/shivam-juyal-034273219/)
- Portfolio: [shivamjuyal24.netlify.app](https://shivamjuyal24.netlify.app/)

---

## 🙏 Acknowledgments

- Inspired by [Vercel](https://vercel.com)
- Built as a learning project to understand deployment platforms, containers, cloud storage, and real-time build workflows

---

<div align="center">
  <p>If you found this project helpful, please consider giving it a ⭐️</p>
  <p>Made with ❤️ by Shivam Juyal</p>
</div>

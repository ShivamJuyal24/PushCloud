# pushcloud-frontend

Minimal Vite + React + Tailwind (shadcn-style components) frontend for Task 3.

## Setup

```bash
cd pushcloud-frontend
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Before you test

Make sure these are already running, in order:
1. Redis
2. MinIO
3. `docker images` shows `builder-image`
4. Your API server (`node index.js` in `api-server/`) — confirm it prints
   `WebSocket Server running → http://localhost:9002` and
   `API Server running → http://localhost:5000`

## Endpoints this app talks to

Set at the top of `src/App.jsx`:

```js
const API_URL = 'http://localhost:5000';
const SOCKET_URL = 'http://localhost:9002';
```

Change these if your servers run on different ports.

## What it does

1. Paste a git URL, click **Deploy**.
2. `POST`s to `${API_URL}/project`, reads back `projectId` and `url`.
3. Immediately opens a Socket.IO connection to `${SOCKET_URL}`, emits
   `subscribe` with `logs:<projectId>`, and appends every `message` event
   to the log panel live.
4. Watches incoming log lines for the `http://<slug>.localhost:8000` URL
   your builder publishes at the end (`🌐 Visit: ...`) and shows it as a
   clickable live banner the moment it appears — not after the build ends.

## Task 3 checklist

- [ ] Network tab: `POST /project` → `200`, response has a `projectId`
- [ ] Log lines appear **while the build is running**, not only at the end
- [ ] Live URL banner appears: `http://<slug>.localhost:8000`
- [ ] Click it — the deployed site loads (re-tests Task 1's proxy)
- [ ] Hard-refresh the deployed site — CSS/JS still load correctly

## If something's wrong

| Symptom | Likely cause |
|---|---|
| CORS error in DevTools | API server CORS not applied, or wrong origin |
| Socket never connects | `SOCKET_URL` port mismatch, or Socket.IO CORS |
| Logs stuck on "Connected to log stream" | Redis/builder not publishing, or channel name mismatch |
| UI shows a live URL but it 404s | Build didn't finish uploading, or Task 1 proxy/MinIO issue |
| Page loads blank, index.html is 200 | JS/CSS 404 — check MIME type or nested asset paths |

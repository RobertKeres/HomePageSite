# HomePageSite

Self-hosted homepage dashboard: React SPA with Obsidian-inspired minimal UI, draggable grid widgets, multiple workspaces, themes, and a small Node API that stores configuration as JSON on disk (ideal for Docker volumes).

## Quick start (GitHub + Docker Compose)

### Option A: Pull image from GHCR (no build)

```bash
mkdir -p data
docker compose -f docker-compose.yaml up -d
```

Image: **`ghcr.io/robertkeres/homepagesite:1.0.1`** (also **`latest`** on `main`; published by GitHub Actions).

Open **[http://localhost:8082](http://localhost:8082)**. Config is saved in **`./data`**.

### Option B: Build locally

```bash
git clone https://github.com/<your-username>/HomePageSite.git
cd HomePageSite
docker compose up --build -d
```

Uses **`docker-compose.yml`** (builds from the Dockerfile in this repo).

Open **[http://localhost:8080](http://localhost:8080)** (HTTP only, not HTTPS).

- Config is stored in **`./data`** on the host (`config.json` and optional `data/profiles/…`).
- Stop: `docker compose down` (add `-f docker-compose.yaml` if you used Option A).
- Rebuild after updates (Option B): `docker compose up --build -d`

Optional: set **`CONFIG_TOKEN`** in `.env` for API protection (see `.env.example`).

### Publish to GitHub

From the repo root (after `git config user.name` / `user.email` if this is your first commit):

```bash
# Install GitHub CLI once: sudo apt install gh && gh auth login
./scripts/publish-github.sh HomePageSite public
```

Or manually:

```bash
git remote add origin https://github.com/<your-username>/HomePageSite.git
git push -u origin main
```

## Run with Docker

### With Docker Compose (recommended)

**Compose V2** uses a space: `docker compose` (not `docker-compose`).

```bash
docker compose up --build
```

#### Permission denied on `docker.sock`

Your user must be allowed to talk to the daemon (do **not** rely on `sudo docker` for daily use):

```bash
sudo usermod -aG docker "$USER"
```

Then **log out and log back in** (or reboot). For a quick test in the current terminal only: `newgrp docker`. Verify with `docker ps` **without** `sudo`.

#### If you use `sudo docker compose …`

The Compose plugin you installed lives under **`~/.docker/cli-plugins`**, which **root does not use**. So `sudo docker compose` may fail or behave oddly (for example `unknown flag: --build`). Use plain `docker compose` after fixing the `docker` group above, **or** install the same binary for root:

```bash
sudo mkdir -p /root/.docker/cli-plugins
sudo cp ~/.docker/cli-plugins/docker-compose /root/.docker/cli-plugins/docker-compose
sudo chmod +x /root/.docker/cli-plugins/docker-compose
```

(System-wide install is also possible; see [Docker Compose install](https://docs.docker.com/compose/install/linux/).)

#### Option 1: Install the Compose V2 plugin manually (no extra apt repo)

If you see `docker: unknown command: docker compose`, the plugin is missing. Pop!_OS / Ubuntu repos often **do not** ship `docker-compose-plugin`; install the binary yourself:

```bash
# x86_64 (most PCs)
mkdir -p ~/.docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-x86_64" \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
docker compose version
```

```bash
# Apple Silicon / ARM64 Linux
mkdir -p ~/.docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-aarch64" \
  -o ~/.docker/cli-plugins/docker-compose
chmod +x ~/.docker/cli-plugins/docker-compose
docker compose version
```

Newer releases: [github.com/docker/compose/releases](https://github.com/docker/compose/releases).

#### Option 2: Docker’s official apt repository

If you use Docker Engine from [docs.docker.com/engine/install](https://docs.docker.com/engine/install/ubuntu/), the `docker-compose-plugin` package is available from that repo.

#### Option 3: No Compose — plain `docker build` + `docker run`

From the repo root:

```bash
chmod +x scripts/docker-run.sh   # once
./scripts/docker-run.sh
```

This builds the image, creates `./data`, and runs the container on port **8080**.

---

**Avoid** the old **`docker-compose`** (hyphen) Python package **1.29.x** on Python 3.12+: it fails with `No module named 'distutils'`. Prefer `docker compose` (V2) or `./scripts/docker-run.sh`.

Open **[http://localhost:8080](http://localhost:8080)** (or `http://127.0.0.1:8080`). The app is **HTTP only**, not HTTPS. If you use `https://`, the browser shows `SSL_ERROR_RX_RECORD_TOO_LONG` — switch to `http://`.

**Blank white page:** hard-refresh (Ctrl+Shift+R). In **F12 → Console** look for red errors; in **Network** confirm `index-*.js` returns **200** (not 404). If you edited `data/config.json` by hand, a bad `activeWorkspaceId` used to crash the UI — pull the latest code or fix that field to match a workspace `id`.

On first visit there is no `config.json` yet; the UI loads defaults and persists after your first change (debounced save).

### Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | HTTP port |
| `DATA_DIR` | `./data` (dev) / `/data` (compose) | Root for configs (see below) |
| `STATIC_DIR` | (dev: `frontend/dist` relative to repo) | Built SPA assets |
| `CONFIG_TOKEN` | (unset) | If set, `GET` and `PUT /api/config` require `Authorization: Bearer <token>` |

### Config storage & profiles

- **Shared (default):** if the browser sends **no** `X-Homepage-Profile` header, the server uses **`$DATA_DIR/config.json`** (one dashboard for everyone without a profile token).
- **Per profile:** Settings can generate a **profile token**. The browser sends `X-Homepage-Profile: <token>` on every request; the server stores that dashboard at **`$DATA_DIR/profiles/<sha256(token)>/config.json`** (isolated per token).

The request body limit is **25 MB** so icon widgets can store small inline **data URLs** (uploaded images).

### API

- `GET /api/health` — health check
- `GET /api/config` — full document; optional header **`X-Homepage-Profile`** selects the profile file; `404` with `{ default }` if that file does not exist yet
- `PUT /api/config` — replace full document (same profile header + optional `Authorization` if `CONFIG_TOKEN` is set)

Writes use a temp file + rename for atomic updates.

## Local development

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

This runs the API on port **8080** and Vite on **5173** with `/api` proxied to the server. Open [http://localhost:5173](http://localhost:5173).

Build production assets:

```bash
npm run build
npm run start
```

The server resolves static files from `frontend/dist` when `STATIC_DIR` is unset (paths assume repo layout).

## Features

- **Workspaces**: switch tabs; add new workspace with “+ New”
- **Edit mode**: pencil (✎) top-right — grid guides, drag handles, remove (×), add widget (+), inspector for layout and fields
- **Widgets**: header (variable font size), icon links (optional title, favicon), list links, search (uses global engine + optional auto-focus on first search widget)
- **Settings** (⚙): theme, full-width grid toggle, background image URL, search engine, auto-focus, **open search in new tab**, **profile token** (isolated `config` on server), optional **CONFIG_TOKEN** bearer (stored in `localStorage`)

If `CONFIG_TOKEN` is enabled on the server, open Settings, enter the token, and use **Save token & reload**.

## Health check

Docker Compose uses a small `node -e "fetch(...)"` health check so no extra tools are required in the image.

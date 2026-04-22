# NordSOCKS Self-Hosted

Self-hosted SOCKS5 proxy management panel. Deploy on your own server and manage proxies through a clean web UI — no cloud required.

## Structure

```
panel/   — React frontend (Vite + TypeScript + Tailwind)
api/     — Node.js backend (Express + PostgreSQL)
```

## Features

- Create and manage SOCKS5 proxies
- JWT authentication with 2FA support
- Account settings (email, password, 2FA)
- Multi-language: English, Russian, Chinese, Spanish, Portuguese, Turkish, German
- Dark / Light mode

## Requirements

- Node.js 20+
- PostgreSQL
- pnpm

## Setup

### 1. Clone

```bash
git clone https://github.com/nordsocks/selfhosted.git
cd selfhosted
```

### 2. Install dependencies

```bash
# API
cd api && pnpm install

# Panel
cd ../panel && pnpm install
```

### 3. Configure environment

Create `api/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/nordsocks
SESSION_SECRET=change_this_to_random_string
PORT=8083
```

Create `panel/.env`:

```env
PORT=3000
BASE_PATH=/
```

### 4. Run

```bash
# Terminal 1 — API
cd api && pnpm dev

# Terminal 2 — Panel
cd panel && pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## License

MIT

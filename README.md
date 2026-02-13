# RabbitScout

A modern, open-source dashboard for RabbitMQ management. Built as a clean alternative to the default RabbitMQ Management UI.

![License](https://img.shields.io/badge/license-MIT-blue)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![Stars](https://img.shields.io/github/stars/Ralve-org/RabbitScout)

---

## Features

**Dashboard** — Real-time overview with canvas-rendered streaming charts, cluster info, queue distribution, animated stats, and memory/uptime metrics.

**Queues** — List, search, sort, inspect messages, publish test messages, and purge queues.

**Exchanges** — View all exchanges with type, features, message rates, and binding details.

**Connections** — Monitor active connections with throughput metrics. Close connections when needed.

**Channels** — View channel state, prefetch counts, consumer counts, and close channels.

**Auth** — Pass-through authentication. Each user logs in with their own RabbitMQ credentials. No server-side password storage.

**Theming** — Dark and light mode with a refined, minimal UI.

---

## Quick Start

### Prerequisites

- Node.js 18.17+
- A running RabbitMQ instance with the [Management Plugin](https://www.rabbitmq.com/docs/management) enabled

### Install

```bash
git clone https://github.com/Ralve-org/RabbitScout.git
cd RabbitScout
npm install
```

### Configure

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your RabbitMQ Management API connection:

```env
RABBITMQ_HOST=localhost
RABBITMQ_PORT=15672
RABBITMQ_PROTOCOL=http
```

That's it. No username or password in the config — users authenticate on the login page with their own RabbitMQ credentials.

### Run

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

Open [http://localhost:3000](http://localhost:3000) and log in with your RabbitMQ credentials.

---

## Docker

Pull the pre-built image from GitHub Container Registry:

```bash
docker run -p 3000:3000 \
  -e RABBITMQ_HOST=your-rabbitmq-host \
  -e RABBITMQ_PORT=15672 \
  -e RABBITMQ_PROTOCOL=http \
  ghcr.io/ralve-org/rabbitscout:latest
```

Or use Docker Compose:

```yaml
services:
  rabbitscout:
    image: ghcr.io/ralve-org/rabbitscout:latest
    ports:
      - "3000:3000"
    environment:
      - RABBITMQ_HOST=your-rabbitmq-host
      - RABBITMQ_PORT=15672
      - RABBITMQ_PROTOCOL=http
```

### Build locally

```bash
docker build -t rabbitscout .
docker run -p 3000:3000 -e RABBITMQ_HOST=localhost -e RABBITMQ_PORT=15672 rabbitscout
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `RABBITMQ_HOST` | Yes | `localhost` | RabbitMQ Management API hostname |
| `RABBITMQ_PORT` | No | `15672` | Management API port (omit for default/standard ports) |
| `RABBITMQ_PROTOCOL` | No | `http` | `http` or `https` |
| `RABBITMQ_API_TIMEOUT_MS` | No | `15000` | API request timeout in milliseconds |

---

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org) (App Router, Server Components)
- **Language**: TypeScript (strict mode, zero `any` types)
- **UI**: [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS](https://tailwindcss.com)
- **Charts**: [uPlot](https://github.com/leeoniya/uPlot) (real-time streaming), [Recharts](https://recharts.org) (static)
- **Animation**: [Motion](https://motion.dev) (spring-animated values, transitions)
- **State**: [Zustand](https://zustand-demo.pmnd.rs)
- **Icons**: [Lucide](https://lucide.dev)

---

## Project Structure

```
app/
  layout.tsx                      Server root layout with metadata
  (auth)/login/page.tsx           Login page
  (dashboard)/
    layout.tsx                    Sidebar + header layout
    page.tsx                      Overview dashboard
    queues/page.tsx               Queue management
    exchanges/page.tsx            Exchange management
    connections/page.tsx          Connection management
    channels/page.tsx             Channel management
  api/
    auth/login/route.ts           POST — validate credentials, set session cookie
    auth/logout/route.ts          POST — clear session cookie
    publish/route.ts              POST — publish message to exchange (handles default exchange)
    rabbitmq/[...path]/route.ts   Catch-all proxy to RabbitMQ Management API

lib/
  rabbitmq/
    client.ts                     Server-side RabbitMQ API client
    config.ts                     Connection configuration
    types.ts                      TypeScript interfaces for all RabbitMQ entities
    errors.ts                     Error classification and handling
  auth/
    store.ts                      Client-side auth state (Zustand)
    session.ts                    httpOnly cookie session helpers
  utils.ts                        Formatting utilities

components/
  layout/                         Sidebar, header
  dashboard/                      Stat cards, charts
  queues/                         Queue table, message viewer, publish dialog
  exchanges/                      Exchange table, binding viewer
  connections/                    Connection table with close support
  channels/                       Channel table with close support
  shared/                         Error boundary, error card
  ui/                             shadcn/ui primitives
```

---

## How Auth Works

RabbitScout uses **pass-through authentication**. When a user logs in, their credentials are validated directly against the RabbitMQ Management API (`/api/whoami`). On success, the credentials are stored in an httpOnly cookie and forwarded with every subsequent API request.

- No passwords are stored in environment variables or on disk
- Each user authenticates with their own RabbitMQ account
- Session expires after 24 hours
- All API calls are proxied through Next.js with the user's own credentials

This means RabbitMQ's built-in permission system (management, monitoring, policymaker, administrator tags) is fully respected.

---

## CI/CD

The included GitHub Actions workflow (`.github/workflows/docker-publish.yml`) automatically builds and pushes a Docker image to GitHub Container Registry on every push to `main` or tagged release.

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run build` to verify everything compiles
5. Open a pull request

---

## License

MIT — see [LICENSE](LICENSE) for details.

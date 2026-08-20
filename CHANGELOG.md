# Changelog

## 2.0.0 — 2026-08-20

A ground-up modernization: new framework generation, a redesigned interface, full queue/exchange management, and fixes for every open issue.

### Fixed

- **Login on RabbitMQ 3.9+ / 4.x reported `isAdmin: false` with empty tags** (#23). `whoami` tags have been returned as a JSON array since RabbitMQ 3.9; they were only parsed as a comma-separated string. Both formats are now handled, so admin-gated UI works on every supported broker.
- **Auth "did nothing" on plain-HTTP production deployments** (#19). The session cookie was always stamped `Secure` in production, so browsers silently dropped it over HTTP. The `Secure` attribute is now derived from the actual request (`x-forwarded-proto` aware), with an optional `COOKIE_SECURE` override.
- **Client-provided connection names were ignored** (#20). Connections now display `user_provided_name` / `client_properties.connection_name` as their primary label, with host:port as the secondary line — matching the official management UI.
- **Dashboard charts were locked to a ~90s live window** (#21). A time-range selector (Live / 10m / 1h / 8h / 24h) now pulls historical samples from the broker's own retention policies.
- Publishing to the **default exchange** silently failed to route: the management API expects `amq.default` in the URL, not an empty segment.
- Expired or missing sessions on API routes returned an HTML redirect; they now return proper `401` JSON.
- The API proxy dropped query strings, breaking any parameterized management call.
- Header page title no longer reads "Overview" on every page; the signed-in user survives page reloads.

### Security

- **Next.js 14.2.35 → 16.3.1** — resolves the July 2026 security release (9 CVEs, including SSRF in rewrites and Server Actions DoS) which was not backported to 14.x, plus all earlier advisories. React 18 → 19.
- **Docker base image `node:18-alpine` (EOL April 2025) → `node:24-alpine`** (active LTS); the container now runs as a non-root user with a `HEALTHCHECK`.
- All transitive-dependency advisories cleared (`npm audit`: 0 vulnerabilities); recharts (unmaintained v2 line) removed entirely.
- New CI pipeline (lint, typecheck, build, e2e) and weekly grouped Dependabot updates for npm, Actions, and Docker.

### Added

- Queue management: create (classic / quorum / stream), delete with type-to-confirm, purge with confirmation.
- Queue detail drawer: live counts, 10-minute rate history, consumers with activity state, arguments.
- Exchange management: declare, delete, inspect bindings, and add bindings to queues.
- Message viewer v2: server-driven peeking (10–250), sorting, timestamp column, meta chips, copy and download payloads, redelivered badges.
- Publish dialog v2: custom headers editor, delivery mode, works from queues and exchanges.
- Connection detail drawer with client properties and TLS info.
- Command palette (`Ctrl/⌘ K`): page navigation, fuzzy jump-to-queue, theme and polling actions.
- Header controls: broker connection status, refresh cadence (2s–30s / paused), global vhost scope, user menu with admin badge.
- Responsive shell — the sidebar becomes an overlay drawer below `lg`; the app is usable on mobile.
- Table craft: density toggle (comfortable/compact), tabular numerals, sticky headers, designed empty states, client-side pagination for very large brokers.
- `/api/health` liveness endpoint; `/api/auth/me` for session rehydration.
- Development mock broker (`npm run mock`) faithfully emulating the 3.x and 4.x Management API, and an e2e suite (`npm run e2e`) that runs in CI.

### Changed

- Tailwind CSS 3 → 4 (CSS-first config), tailwind-merge 3, unified `radix-ui` package, lucide-react 1.x, Motion 13, Zustand 5.0.15, TypeScript 5.9, ESLint 9 flat config.
- `middleware.ts` → `proxy.ts` (Next 16 convention).
- Dark theme elevation refined: popovers/menus now sit visibly above cards; focus rings no longer mutate element geometry.
- Charts: uPlot everywhere with hover tooltips; the queue-distribution donut is a dependency-free SVG.

### Removed

- recharts, tailwindcss-animate (superseded), per-package `@radix-ui/react-*` dependencies, and the redundant `x-middleware-subrequest` header block (CVE-2025-29927 has been patched in the framework since 14.2.25).

## 1.0.0 — 2025-04

Initial rewrite with modern architecture.

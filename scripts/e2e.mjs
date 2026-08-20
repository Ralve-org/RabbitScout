// End-to-end tests: production build against the mock RabbitMQ broker.
//
// Prerequisites: `npm run build` (CI runs it in the previous step).
// Usage: node scripts/e2e.mjs
//
// Covers the full auth + proxy surface, including the regressions behind
// GitHub issues #19 (Secure cookie over HTTP), #20 (connection names),
// #21 (time-range samples), and #23 (whoami tags array vs string).

import { spawn, execSync } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const MOCK4_PORT = 15774
const MOCK38_PORT = 15773
const APP_PORT = 3199
const APP = `http://localhost:${APP_PORT}`

const procs = []
let passed = 0
let failed = 0

function start(cmd, args, env = {}) {
  const p = spawn(cmd, args, {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })
  procs.push(p)
  return p
}

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      await fetch(url)
      return
    } catch {
      await sleep(500)
    }
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function check(name, cond, detail = '') {
  if (cond) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

async function login(username, password, headers = {}) {
  const res = await fetch(`${APP}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ username, password }),
    redirect: 'manual',
  })
  const body = await res.json().catch(() => null)
  return { res, body, cookie: res.headers.get('set-cookie') ?? '' }
}

async function main() {
  console.log('Starting mock brokers and production server…')
  start('node', ['scripts/mock-rabbitmq.mjs', String(MOCK4_PORT), '4'])
  start('node', ['scripts/mock-rabbitmq.mjs', String(MOCK38_PORT), '3'])
  start('npx', ['next', 'start', '-p', String(APP_PORT)], {
    RABBITMQ_HOST: 'localhost',
    RABBITMQ_PORT: String(MOCK4_PORT),
    RABBITMQ_PROTOCOL: 'http',
  })

  await waitFor(`http://localhost:${MOCK4_PORT}/api/whoami`)
  await waitFor(`${APP}/api/health`)

  console.log('\nHealth & auth gate')
  {
    const res = await fetch(`${APP}/api/health`)
    check('GET /api/health → 200', res.status === 200)
  }
  {
    const res = await fetch(`${APP}/api/rabbitmq/overview`, { redirect: 'manual' })
    check(
      'unauthenticated API call → 401 JSON (not a redirect)',
      res.status === 401,
      `got ${res.status}`,
    )
  }
  {
    const res = await fetch(`${APP}/queues`, { redirect: 'manual' })
    const loc = res.headers.get('location') ?? ''
    check(
      'unauthenticated page → redirect to /login with next param',
      res.status >= 300 && res.status < 400 && loc.includes('/login') && loc.includes('next=%2Fqueues'),
      `got ${res.status} → ${loc}`,
    )
  }

  console.log('\nLogin (RabbitMQ 4.x mock — tags as array; issues #19, #23)')
  let cookie = ''
  {
    const { res, body, cookie: c } = await login('admin', 'admin')
    cookie = c.split(';')[0]
    check('valid login → 200', res.status === 200)
    check('isAdmin is true (tags array parsed) [#23]', body?.user?.isAdmin === true, JSON.stringify(body?.user))
    check(
      "tags contain 'administrator' [#23]",
      Array.isArray(body?.user?.tags) && body.user.tags.includes('administrator'),
    )
    check('session cookie set + HttpOnly', /rmq-session=/.test(c) && /HttpOnly/i.test(c))
    check('cookie NOT Secure over plain HTTP [#19]', !/;\s*Secure/i.test(c), c)
  }
  {
    const { cookie: c } = await login('admin', 'admin', { 'x-forwarded-proto': 'https' })
    check('cookie IS Secure behind HTTPS proxy [#19]', /;\s*Secure/i.test(c), c)
  }
  {
    const { res } = await login('admin', 'wrong')
    check('invalid credentials → 401', res.status === 401)
  }
  {
    const { res, body } = await login('monitor', 'monitor')
    check('non-admin login → isAdmin false', res.status === 200 && body?.user?.isAdmin === false)
  }

  console.log('\nAuthenticated proxy surface')
  const authed = (path, init = {}) =>
    fetch(`${APP}${path}`, { ...init, headers: { cookie, ...(init.headers ?? {}) } })
  {
    const res = await authed('/api/auth/me')
    const body = await res.json()
    check('GET /api/auth/me returns session user', res.status === 200 && body?.user?.username === 'admin')
  }
  {
    const res = await authed('/api/rabbitmq/overview')
    const body = await res.json()
    check('overview proxies through', res.status === 200 && body?.object_totals?.queues > 0)
  }
  {
    const res = await authed('/api/rabbitmq/overview?msg_rates_age=600&msg_rates_incr=5')
    const body = await res.json()
    check(
      'query params forwarded — samples present [#21]',
      Array.isArray(body?.message_stats?.publish_details?.samples) &&
        body.message_stats.publish_details.samples.length > 10,
    )
  }
  {
    const res = await authed('/api/rabbitmq/queues')
    const body = await res.json()
    check('queues list', Array.isArray(body) && body.length > 0)
  }
  {
    const res = await authed('/api/rabbitmq/vhosts')
    const body = await res.json()
    check('vhosts list (header switcher)', Array.isArray(body) && body.some((v) => v.name === '/'))
  }
  {
    const res = await authed('/api/rabbitmq/connections')
    const body = await res.json()
    const named = Array.isArray(body) && body.find((c) => c.client_properties?.connection_name)
    check('connection_name exposed for display [#20]', Boolean(named))
  }
  {
    const res = await authed(
      `/api/rabbitmq/queues/${encodeURIComponent('/')}/orders.created/get`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 5, ackmode: 'ack_requeue_true', encoding: 'auto' }),
      },
    )
    const body = await res.json()
    check('queue message peek', Array.isArray(body) && body.length > 0 && 'payload' in body[0])
  }
  {
    const res = await authed('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vhost: '/', exchange: '', routing_key: 'orders.created', payload: '{"x":1}' }),
    })
    const body = await res.json()
    check('publish via default exchange', res.status === 200 && body?.routed === true)
  }
  {
    const res = await authed(`/api/rabbitmq/queues/${encodeURIComponent('/')}/e2e.tmp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durable: true, auto_delete: false, arguments: {} }),
    })
    check('queue create (PUT proxies)', res.status === 200 || res.status === 201)
  }
  {
    const res = await authed(`/api/rabbitmq/queues/${encodeURIComponent('/')}/e2e.tmp`, {
      method: 'DELETE',
    })
    check('queue delete (DELETE proxies)', res.ok)
  }
  {
    const res = await authed('/api/auth/logout', { method: 'POST' })
    const c = res.headers.get('set-cookie') ?? ''
    check('logout clears cookie', res.status === 200 && /rmq-session=;|rmq-session=""/.test(c))
  }

  console.log('\nLogin (RabbitMQ ≤3.8 mock — tags as comma string; #23 back-compat)')
  {
    // Point a second app instance at the 3.8-style mock
    start('npx', ['next', 'start', '-p', String(APP_PORT + 1)], {
      RABBITMQ_HOST: 'localhost',
      RABBITMQ_PORT: String(MOCK38_PORT),
      RABBITMQ_PROTOCOL: 'http',
    })
    await waitFor(`http://localhost:${APP_PORT + 1}/api/health`)
    const res = await fetch(`http://localhost:${APP_PORT + 1}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    })
    const body = await res.json()
    check(
      'string tags still parse — isAdmin true [#23]',
      res.status === 200 && body?.user?.isAdmin === true && body?.user?.tags?.includes('administrator'),
      JSON.stringify(body?.user),
    )
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exitCode = failed > 0 ? 1 : 0
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => {
    for (const p of procs) {
      try {
        if (process.platform === 'win32') {
          // Kill the whole tree — shell-spawned children outlive p.kill()
          execSync(`taskkill /pid ${p.pid} /T /F`, { stdio: 'ignore' })
        } else {
          p.kill()
        }
      } catch {
        // already gone
      }
    }
    setTimeout(() => process.exit(process.exitCode ?? 0), 500)
  })

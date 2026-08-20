// Mock RabbitMQ Management API server for end-to-end testing RabbitScout.
// Faithfully mimics response shapes of RabbitMQ 3.13.x and 4.x.
//
// Usage: node mock-rabbitmq.mjs [port] [mode]
//   port: default 15672
//   mode: "3" (tags as comma-separated string, 3.x) | "4" (tags as array, 4.x) — default "4"
//
// Valid credentials: admin/admin (administrator), monitor/monitor (monitoring), plain/plain (no tags)

import http from 'node:http'

const PORT = Number(process.argv[2] || 15672)
const MODE = process.argv[3] === '3' ? '3' : '4'

const USERS = {
  admin: { password: 'admin', tags: ['administrator'] },
  monitor: { password: 'monitor', tags: ['monitoring'] },
  plain: { password: 'plain', tags: [] },
}

const START = Date.now()

function auth(req) {
  const h = req.headers.authorization || ''
  if (!h.startsWith('Basic ')) return null
  try {
    const [u, p] = Buffer.from(h.slice(6), 'base64').toString().split(':')
    if (USERS[u] && USERS[u].password === p) return { name: u, tags: USERS[u].tags }
  } catch {}
  return null
}

function rate(base) { return Math.max(0, base + (Math.random() - 0.5) * base * 0.4) }

function rateDetails(base, age, incr) {
  const d = { rate: rate(base) }
  if (age && incr) {
    const now = Date.now()
    const samples = []
    for (let t = 0; t <= age; t += incr) {
      samples.push({ sample: Math.round(base * (age - t) + Math.random() * base * incr), timestamp: now - t * 1000 })
    }
    d.samples = samples
    d.avg_rate = base
    d.avg = base
  }
  return d
}

const QUEUE_NAMES = [
  ['orders.created', 'running', 1200, 3, 14.2],
  ['orders.shipped', 'running', 240, 2, 6.1],
  ['emails.outbound', 'running', 18456, 1, 88.7],
  ['emails.dlq', 'idle', 3120, 0, 0],
  ['payments.webhooks', 'running', 12, 5, 2.4],
  ['analytics.events', 'running', 245001, 8, 412.0],
  ['search.reindex', 'idle', 0, 0, 0],
  ['notifications.push', 'running', 87, 2, 9.9],
]

function queues(age, incr) {
  return QUEUE_NAMES.map(([name, state, messages, consumers, rt]) => ({
    name, vhost: '/', state, durable: true, auto_delete: false, exclusive: false,
    consumers, consumer_utilisation: consumers ? 0.87 : null, policy: '',
    messages, messages_ready: Math.floor(messages * 0.92),
    messages_unacknowledged: messages - Math.floor(messages * 0.92),
    memory: 34816 + messages * 120,
    arguments: name.includes('dlq') ? {} : { 'x-queue-type': name.startsWith('analytics') ? 'quorum' : 'classic' },
    message_stats: {
      publish: 1e6, publish_details: rateDetails(rt, age, incr),
      deliver_get: 1e6, deliver_get_details: rateDetails(rt * 0.97, age, incr),
      ack: 9e5, ack_details: rateDetails(rt * 0.95, age, incr),
      redeliver: 120, redeliver_details: rateDetails(0.1, age, incr),
    },
  }))
}

function sendJSON(res, code, body) {
  const data = JSON.stringify(body)
  res.writeHead(code, { 'content-type': 'application/json' })
  res.end(data)
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  const path = url.pathname
  const q = url.searchParams
  const lengthsAge = Number(q.get('lengths_age')) || 0
  const lengthsIncr = Number(q.get('lengths_incr')) || 0
  const ratesAge = Number(q.get('msg_rates_age')) || 0
  const ratesIncr = Number(q.get('msg_rates_incr')) || 0

  const user = auth(req)
  if (!user) {
    res.writeHead(401, { 'www-authenticate': 'Basic realm="RabbitMQ Management"', 'content-type': 'application/json' })
    return res.end(JSON.stringify({ error: 'not_authorised', reason: 'Login failed' }))
  }

  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    // whoami — THE 3.x vs 4.x difference
    if (path === '/api/whoami') {
      const tags = MODE === '3' ? user.tags.join(',') : user.tags
      return sendJSON(res, 200, { name: user.name, tags, is_internal_user: false })
    }

    if (path === '/api/overview') {
      const ov = {
        management_version: MODE === '3' ? '3.13.7' : '4.2.2',
        rabbitmq_version: MODE === '3' ? '3.13.7' : '4.2.2',
        rates_mode: 'basic',
        node: 'rabbit@mock',
        message_stats: {
          publish: 5_000_000, publish_details: rateDetails(120, ratesAge, ratesIncr),
          deliver_get: 4_900_000, deliver_get_details: rateDetails(115, ratesAge, ratesIncr),
          confirm: 5_000_000, confirm_details: rateDetails(120, ratesAge, ratesIncr),
          ack: 4_800_000, ack_details: rateDetails(114, ratesAge, ratesIncr),
        },
        queue_totals: {
          messages: 268119, messages_ready: 246669, messages_unacknowledged: 21450,
          messages_details: rateDetails(80, lengthsAge, lengthsIncr),
          messages_ready_details: rateDetails(75, lengthsAge, lengthsIncr),
          messages_unacknowledged_details: rateDetails(5, lengthsAge, lengthsIncr),
        },
        object_totals: { connections: 4, channels: 9, exchanges: 12, queues: 8, consumers: 21 },
        listeners: [
          { node: 'rabbit@mock', protocol: 'amqp', ip_address: '::', port: 5672 },
          { node: 'rabbit@mock', protocol: 'http', ip_address: '::', port: 15672 },
        ],
      }
      return sendJSON(res, 200, ov)
    }

    if (path === '/api/queues' || path === '/api/queues/') {
      const page = Number(q.get('page'))
      const all = queues(lengthsAge, lengthsIncr)
      if (page) {
        const size = Number(q.get('page_size')) || 100
        const name = (q.get('name') || '').toLowerCase()
        const filtered = name ? all.filter((x) => x.name.toLowerCase().includes(name)) : all
        const items = filtered.slice((page - 1) * size, page * size)
        return sendJSON(res, 200, {
          filtered_count: filtered.length, item_count: items.length,
          items, page, page_count: Math.max(1, Math.ceil(filtered.length / size)),
          page_size: size, total_count: all.length,
        })
      }
      return sendJSON(res, 200, all)
    }

    const qm = path.match(/^\/api\/queues\/([^/]+)\/([^/]+)$/)
    if (qm && req.method === 'GET') {
      const name = decodeURIComponent(qm[2])
      const found = queues(lengthsAge, lengthsIncr).find((x) => x.name === name)
      if (!found) return sendJSON(res, 404, { error: 'Object Not Found', reason: 'Not Found' })
      found.consumer_details = Array.from({ length: found.consumers }, (_, i) => ({
        consumer_tag: `ctag-${i}.${name}`, ack_required: true, prefetch_count: 10, active: true,
        queue: { name, vhost: '/' },
        channel_details: { name: `172.17.0.4:52012 -> 172.17.0.2:5672 (${i + 1})`, connection_name: '172.17.0.4:52012 -> 172.17.0.2:5672', peer_host: '172.17.0.4', peer_port: 52012, user: 'admin', number: i + 1 },
      }))
      return sendJSON(res, 200, found)
    }
    if (qm && req.method === 'PUT') return sendJSON(res, 201, {})
    if (qm && req.method === 'DELETE') { res.writeHead(204); return res.end() }

    if (/^\/api\/queues\/[^/]+\/[^/]+\/contents$/.test(path) && req.method === 'DELETE') {
      res.writeHead(204); return res.end()
    }

    if (/^\/api\/queues\/[^/]+\/[^/]+\/get$/.test(path) && req.method === 'POST') {
      let count = 10
      try { count = JSON.parse(body).count ?? 10 } catch {}
      const msgs = Array.from({ length: Math.min(count, 50) }, (_, i) => ({
        payload_bytes: 120 + i, redelivered: i % 7 === 0, exchange: 'orders',
        routing_key: i % 3 === 0 ? 'orders.created' : 'orders.priority',
        message_count: 1200 - i,
        properties: i % 2 === 0
          ? { headers: { 'x-attempt': i, source: 'api-gateway' }, delivery_mode: 2, content_type: 'application/json', timestamp: Math.floor(Date.now() / 1000) - i * 60, message_id: `m-${1000 + i}` }
          : { headers: null, delivery_mode: 1 },
        payload: JSON.stringify({ orderId: 1000 + i, status: 'created', amount: (Math.random() * 500).toFixed(2) }),
        payload_encoding: 'string',
      }))
      return sendJSON(res, 200, msgs)
    }

    if (path === '/api/exchanges' || path === '/api/exchanges/') {
      const types = ['direct', 'fanout', 'headers', 'topic']
      const base = ['', 'amq.direct', 'amq.fanout', 'amq.headers', 'amq.match', 'amq.rabbitmq.trace', 'amq.topic'].map((name, i) => ({
        name, vhost: '/', type: types[i % 4], durable: true, auto_delete: false,
        internal: name === 'amq.rabbitmq.trace', arguments: {}, user_who_performed_action: 'rmq-internal',
      }))
      base.push(
        { name: 'orders', vhost: '/', type: 'topic', durable: true, auto_delete: false, internal: false, arguments: {}, message_stats: { publish_in: 9e5, publish_in_details: rateDetails(20, ratesAge, ratesIncr), publish_out: 9e5, publish_out_details: rateDetails(19, ratesAge, ratesIncr) } },
        { name: 'events', vhost: '/', type: 'fanout', durable: true, auto_delete: false, internal: false, arguments: {}, message_stats: { publish_in: 4e6, publish_in_details: rateDetails(400, ratesAge, ratesIncr), publish_out: 8e6, publish_out_details: rateDetails(800, ratesAge, ratesIncr) } },
        { name: 'dlx', vhost: '/', type: 'direct', durable: true, auto_delete: false, internal: false, arguments: {} },
      )
      return sendJSON(res, 200, base)
    }

    if (/^\/api\/exchanges\/[^/]+\/[^/]+\/bindings\/source$/.test(path)) {
      return sendJSON(res, 200, [
        { source: 'orders', destination: 'orders.created', destination_type: 'queue', routing_key: 'orders.created.*', arguments: {}, vhost: '/', properties_key: 'orders.created.%2A' },
        { source: 'orders', destination: 'orders.shipped', destination_type: 'queue', routing_key: 'orders.shipped.#', arguments: { 'x-match': 'all' }, vhost: '/', properties_key: 'orders.shipped.%23' },
      ])
    }
    if (/^\/api\/exchanges\/[^/]+\/[^/]+$/.test(path) && req.method === 'PUT') return sendJSON(res, 201, {})
    if (/^\/api\/exchanges\/[^/]+\/[^/]+$/.test(path) && req.method === 'DELETE') { res.writeHead(204); return res.end() }
    if (/^\/api\/exchanges\/[^/]+\/[^/]+\/publish$/.test(path) && req.method === 'PUT') {
      return sendJSON(res, 200, { routed: true })
    }
    if (/^\/api\/bindings\/[^/]+\/e\/[^/]+\/q\/[^/]+$/.test(path) && req.method === 'POST') {
      res.writeHead(201, { location: 'orders.created.%2A' }); return res.end()
    }

    if (path === '/api/connections' || path === '/api/connections/') {
      const mk = (i, product, version, connName) => ({
        name: `172.17.0.${i} :5201${i} -> 172.17.0.2:5672`,
        user: i % 2 ? 'admin' : 'plain', vhost: '/', host: '172.17.0.2', port: 5672,
        peer_host: `172.17.0.${i}`, peer_port: 52010 + i, ssl: i === 5,
        protocol: 'AMQP 0-9-1', auth_mechanism: 'PLAIN', state: 'running',
        connected_at: START - i * 3600_000, timeout: 60, frame_max: 131072, channel_max: 2047,
        channels: 1 + (i % 3), recv_oct: 8_421_000 * i, recv_oct_details: rateDetails(4200, 0, 0),
        send_oct: 3_100_000 * i, send_oct_details: rateDetails(1800, 0, 0),
        recv_cnt: 91_000 * i, send_cnt: 88_000 * i, send_pend: 0,
        client_properties: {
          platform: 'Node.js', product, version,
          ...(connName ? { connection_name: connName } : {}),
        },
      })
      return sendJSON(res, 200, [
        mk(3, 'amqplib', '0.10.4', 'order-service'),         // has connection_name (issue #20)
        mk(4, 'amqplib', '0.10.4', 'email-worker-1'),
        mk(5, 'rabbitmq-java-client', '5.20.0', null),        // no connection_name
        mk(6, 'pika', '1.3.2', 'analytics-ingest'),
      ])
    }
    if (/^\/api\/connections\/[^/]+$/.test(path) && req.method === 'DELETE') { res.writeHead(204); return res.end() }

    if (path === '/api/channels' || path === '/api/channels/') {
      const chans = Array.from({ length: 9 }, (_, i) => ({
        name: `172.17.0.${3 + (i % 4)}:5201${3 + (i % 4)} -> 172.17.0.2:5672 (${1 + (i % 3)})`,
        number: 1 + (i % 3), user: i % 2 ? 'admin' : 'plain', vhost: '/', node: 'rabbit@mock',
        state: i === 8 ? 'flow' : 'running', prefetch_count: 10 * (1 + (i % 3)), global_prefetch_count: 0,
        messages_unacknowledged: i * 3, messages_unconfirmed: 0, messages_uncommitted: 0,
        acks_uncommitted: 0, consumer_count: i % 4, confirm: true, transactional: false,
        connection_details: { name: `172.17.0.${3 + (i % 4)}:5201${3 + (i % 4)} -> 172.17.0.2:5672`, peer_host: `172.17.0.${3 + (i % 4)}`, peer_port: 52013, user: i % 2 ? 'admin' : 'plain' },
        message_stats: { deliver_get: 100, deliver_get_details: rateDetails(12, 0, 0), publish: 100, publish_details: rateDetails(11, 0, 0) },
      }))
      return sendJSON(res, 200, chans)
    }

    if (/^\/api\/nodes\/[^/]+$/.test(path)) {
      return sendJSON(res, 200, {
        name: 'rabbit@mock', mem_used: 214_748_364, mem_limit: 6_442_450_944,
        disk_free: 187_904_819_200, disk_free_limit: 50_000_000,
        fd_used: 42, fd_total: 1_048_576, sockets_used: 8, sockets_total: 943_626,
        proc_used: 512, proc_total: 1_048_576, uptime: Date.now() - START + 86_400_000 * 12,
        run_queue: 1, processors: 8,
        partitions: [], mem_alarm: false, disk_free_alarm: false,
      })
    }

    if (path === '/api/vhosts') {
      return sendJSON(res, 200, [
        { name: '/', description: 'Default virtual host', tags: [], tracing: false },
        { name: 'staging', description: '', tags: [], tracing: false },
      ])
    }

    if (path.startsWith('/api/health/checks/')) return sendJSON(res, 200, { status: 'ok' })

    sendJSON(res, 404, { error: 'Object Not Found', reason: 'Not Found' })
  })
})

server.listen(PORT, () => {
  console.log(`Mock RabbitMQ ${MODE === '3' ? '3.13.7' : '4.2.2'} Management API on http://localhost:${PORT}`)
})

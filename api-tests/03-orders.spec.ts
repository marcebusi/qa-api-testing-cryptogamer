import { test, expect, request as playwrightRequest } from '@playwright/test'

const BASE  = process.env.API_URL            ?? 'http://localhost:3001'
const EMAIL = process.env.TEST_USER_EMAIL    ?? 'testuser@cryptogamer.test'
const PASS  = process.env.TEST_USER_PASSWORD ?? 'TestPass123!'

// Token compartido — se obtiene una sola vez para evitar rate limiting
let sharedToken = ''

test.beforeAll(async () => {
  const context = await playwrightRequest.newContext({ baseURL: BASE })
  const res = await context.post('/api/auth/login', {
    data: { email: EMAIL, password: PASS },
  })
  if (res.ok()) {
    sharedToken = (await res.json()).token
  }
  await context.dispose()
})

test.describe('Orders API', () => {

  // ─── SMOKE ────────────────────────────────────────────────────────────────

  test('@smoke GET /orders/me - autenticado devuelve array', async ({ request }) => {
    const res = await request.get(`${BASE}/api/orders/me`, {
      headers: { Authorization: `Bearer ${sharedToken}` },
    })

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  // ─── AUTORIZACIÓN ─────────────────────────────────────────────────────────

  test('@regression GET /orders/me - sin token devuelve 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/orders/me`)
    expect(res.status()).toBe(401)
  })

  test('@regression GET /orders/me - token inválido devuelve 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/orders/me`, {
      headers: { Authorization: 'Bearer invalido.token.falso' },
    })
    expect(res.status()).toBe(401)
  })

  test('@regression POST /orders - sin autenticación devuelve 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/orders`, {
      data: { items: [], total: 0 },
    })
    expect(res.status()).toBe(401)
  })

  // ─── AISLAMIENTO ENTRE USUARIOS ───────────────────────────────────────────

  test('@regression GET /orders/me - dos usuarios no comparten órdenes', async ({ request }) => {
    const unique = Date.now()
    const email2 = `order_test_${unique}@cryptogamer.test`
    const regRes = await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'User B', email: email2, password: 'TestPass123!' },
    })
    const token2 = (await regRes.json()).token

    const res1 = await request.get(`${BASE}/api/orders/me`, {
      headers: { Authorization: `Bearer ${sharedToken}` },
    })
    const res2 = await request.get(`${BASE}/api/orders/me`, {
      headers: { Authorization: `Bearer ${token2}` },
    })

    const orders1: any[] = await res1.json()
    const orders2: any[] = await res2.json()

    if (orders1.length > 0) {
      const ids1 = orders1.map((o: any) => o.id)
      const ids2 = orders2.map((o: any) => o.id)
      const cruce = ids1.filter((id: string) => ids2.includes(id))
      expect(cruce).toHaveLength(0)
    }
  })

  // ─── TRACKING ─────────────────────────────────────────────────────────────

  test('@regression GET /orders/track/:orderNumber - número inválido devuelve error', async ({ request }) => {
    const res = await request.get(`${BASE}/api/orders/track/ORD-NOEXISTE-99999`)
    // La API devuelve 400 (formato inválido) o 404 (no encontrado) — ambos son correctos
    expect([400, 404]).toContain(res.status())
  })

  // ─── SCHEMA ───────────────────────────────────────────────────────────────

  test('@regression GET /orders/me - schema de cada orden si existen', async ({ request }) => {
    const res = await request.get(`${BASE}/api/orders/me`, {
      headers: { Authorization: `Bearer ${sharedToken}` },
    })

    const orders = await res.json()
    for (const o of orders.slice(0, 3)) {
      expect(o).toHaveProperty('id')
      expect(o).toHaveProperty('status')
      expect(o).toHaveProperty('total')
      expect(typeof o.total).toBe('number')
      expect(o.total).toBeGreaterThanOrEqual(0)
    }
  })

  test('@regression GET /orders/me - status de cada orden es un valor válido', async ({ request }) => {
    const res = await request.get(`${BASE}/api/orders/me`, {
      headers: { Authorization: `Bearer ${sharedToken}` },
    })

    const validStatuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
    const orders = await res.json()

    for (const o of orders) {
      expect(
        validStatuses,
        `Status "${o.status}" no es un valor válido`
      ).toContain(o.status)
    }
  })
})

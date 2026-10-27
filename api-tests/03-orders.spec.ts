import { test, expect } from '@playwright/test'

const BASE  = process.env.API_URL ?? 'http://localhost:3001'
const EMAIL = process.env.TEST_USER_EMAIL ?? 'testuser@cryptogamer.test'
const PASS  = process.env.TEST_USER_PASSWORD ?? 'TestPass123!'

// Helper: obtener token de login
async function getToken(request: any): Promise<string> {
  const res = await request.post(`${BASE}/api/auth/login`, {
    data: { email: EMAIL, password: PASS },
  })
  if (!res.ok()) throw new Error(`Login falló: ${res.status()}`)
  return (await res.json()).token
}

test.describe('Orders API', () => {

  test('@smoke GET /orders/me - autenticado devuelve array', async ({ request }) => {
    const token = await getToken(request)
    const res = await request.get(`${BASE}/api/orders/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

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

  test('@regression GET /orders/track/:orderNumber - orden inexistente devuelve 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/orders/track/ORD-NOEXISTE-99999`)
    expect(res.status()).toBe(404)
  })

  test('@regression POST /orders - sin autenticación devuelve 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/orders`, {
      data: { items: [], total: 0 },
    })
    expect(res.status()).toBe(401)
  })

  test('@regression GET /orders/me - schema de cada orden si existen', async ({ request }) => {
    const token = await getToken(request)
    const res = await request.get(`${BASE}/api/orders/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const orders = await res.json()
    // Si hay órdenes, verificar que tengan los campos mínimos
    for (const o of orders.slice(0, 3)) {
      expect(o).toHaveProperty('id')
      expect(o).toHaveProperty('status')
      expect(o).toHaveProperty('total')
    }
  })
})

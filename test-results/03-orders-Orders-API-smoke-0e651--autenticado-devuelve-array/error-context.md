# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 03-orders.spec.ts >> Orders API >> @smoke GET /orders/me - autenticado devuelve array
- Location: api-tests\03-orders.spec.ts:25:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 401
```

# Test source

```ts
  1   | import { test, expect, request as playwrightRequest } from '@playwright/test'
  2   | 
  3   | const BASE  = process.env.API_URL            ?? 'http://localhost:3001'
  4   | const EMAIL = process.env.TEST_USER_EMAIL    ?? 'testuser@cryptogamer.test'
  5   | const PASS  = process.env.TEST_USER_PASSWORD ?? 'TestPass123!'
  6   | 
  7   | // Token compartido — se obtiene una sola vez para evitar rate limiting
  8   | let sharedToken = ''
  9   | 
  10  | test.beforeAll(async () => {
  11  |   const context = await playwrightRequest.newContext({ baseURL: BASE })
  12  |   const res = await context.post('/api/auth/login', {
  13  |     data: { email: EMAIL, password: PASS },
  14  |   })
  15  |   if (res.ok()) {
  16  |     sharedToken = (await res.json()).token
  17  |   }
  18  |   await context.dispose()
  19  | })
  20  | 
  21  | test.describe('Orders API', () => {
  22  | 
  23  |   // ─── SMOKE ────────────────────────────────────────────────────────────────
  24  | 
  25  |   test('@smoke GET /orders/me - autenticado devuelve array', async ({ request }) => {
  26  |     const res = await request.get(`${BASE}/api/orders/me`, {
  27  |       headers: { Authorization: `Bearer ${sharedToken}` },
  28  |     })
  29  | 
> 30  |     expect(res.status()).toBe(200)
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  31  |     const body = await res.json()
  32  |     expect(Array.isArray(body)).toBe(true)
  33  |   })
  34  | 
  35  |   // ─── AUTORIZACIÓN ─────────────────────────────────────────────────────────
  36  | 
  37  |   test('@regression GET /orders/me - sin token devuelve 401', async ({ request }) => {
  38  |     const res = await request.get(`${BASE}/api/orders/me`)
  39  |     expect(res.status()).toBe(401)
  40  |   })
  41  | 
  42  |   test('@regression GET /orders/me - token inválido devuelve 401', async ({ request }) => {
  43  |     const res = await request.get(`${BASE}/api/orders/me`, {
  44  |       headers: { Authorization: 'Bearer invalido.token.falso' },
  45  |     })
  46  |     expect(res.status()).toBe(401)
  47  |   })
  48  | 
  49  |   test('@regression POST /orders - sin autenticación devuelve 401', async ({ request }) => {
  50  |     const res = await request.post(`${BASE}/api/orders`, {
  51  |       data: { items: [], total: 0 },
  52  |     })
  53  |     expect(res.status()).toBe(401)
  54  |   })
  55  | 
  56  |   // ─── AISLAMIENTO ENTRE USUARIOS ───────────────────────────────────────────
  57  | 
  58  |   test('@regression GET /orders/me - dos usuarios no comparten órdenes', async ({ request }) => {
  59  |     const unique = Date.now()
  60  |     const email2 = `order_test_${unique}@cryptogamer.test`
  61  |     const regRes = await request.post(`${BASE}/api/auth/register`, {
  62  |       data: { name: 'User B', email: email2, password: 'TestPass123!' },
  63  |     })
  64  |     const token2 = (await regRes.json()).token
  65  | 
  66  |     const res1 = await request.get(`${BASE}/api/orders/me`, {
  67  |       headers: { Authorization: `Bearer ${sharedToken}` },
  68  |     })
  69  |     const res2 = await request.get(`${BASE}/api/orders/me`, {
  70  |       headers: { Authorization: `Bearer ${token2}` },
  71  |     })
  72  | 
  73  |     const orders1: any[] = await res1.json()
  74  |     const orders2: any[] = await res2.json()
  75  | 
  76  |     if (orders1.length > 0) {
  77  |       const ids1 = orders1.map((o: any) => o.id)
  78  |       const ids2 = orders2.map((o: any) => o.id)
  79  |       const cruce = ids1.filter((id: string) => ids2.includes(id))
  80  |       expect(cruce).toHaveLength(0)
  81  |     }
  82  |   })
  83  | 
  84  |   // ─── TRACKING ─────────────────────────────────────────────────────────────
  85  | 
  86  |   test('@regression GET /orders/track/:orderNumber - número inválido devuelve error', async ({ request }) => {
  87  |     const res = await request.get(`${BASE}/api/orders/track/ORD-NOEXISTE-99999`)
  88  |     // La API devuelve 400 (formato inválido) o 404 (no encontrado) — ambos son correctos
  89  |     expect([400, 404]).toContain(res.status())
  90  |   })
  91  | 
  92  |   // ─── SCHEMA ───────────────────────────────────────────────────────────────
  93  | 
  94  |   test('@regression GET /orders/me - schema de cada orden si existen', async ({ request }) => {
  95  |     const res = await request.get(`${BASE}/api/orders/me`, {
  96  |       headers: { Authorization: `Bearer ${sharedToken}` },
  97  |     })
  98  | 
  99  |     const orders = await res.json()
  100 |     for (const o of orders.slice(0, 3)) {
  101 |       expect(o).toHaveProperty('id')
  102 |       expect(o).toHaveProperty('status')
  103 |       expect(o).toHaveProperty('total')
  104 |       expect(typeof o.total).toBe('number')
  105 |       expect(o.total).toBeGreaterThanOrEqual(0)
  106 |     }
  107 |   })
  108 | 
  109 |   test('@regression GET /orders/me - status de cada orden es un valor válido', async ({ request }) => {
  110 |     const res = await request.get(`${BASE}/api/orders/me`, {
  111 |       headers: { Authorization: `Bearer ${sharedToken}` },
  112 |     })
  113 | 
  114 |     const validStatuses = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
  115 |     const orders = await res.json()
  116 | 
  117 |     for (const o of orders) {
  118 |       expect(
  119 |         validStatuses,
  120 |         `Status "${o.status}" no es un valor válido`
  121 |       ).toContain(o.status)
  122 |     }
  123 |   })
  124 | })
  125 | 
```
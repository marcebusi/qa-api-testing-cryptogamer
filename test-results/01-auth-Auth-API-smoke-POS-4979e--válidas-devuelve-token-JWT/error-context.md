# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01-auth.spec.ts >> Auth API >> @smoke POST /login - credenciales válidas devuelve token JWT
- Location: api-tests\01-auth.spec.ts:57:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 429
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | const BASE  = process.env.API_URL            ?? 'http://localhost:3001'
  4   | const EMAIL = process.env.TEST_USER_EMAIL    ?? 'testuser@cryptogamer.test'
  5   | const PASS  = process.env.TEST_USER_PASSWORD ?? 'TestPass123!'
  6   | 
  7   | test.describe('Auth API', () => {
  8   | 
  9   |   // ─── REGISTRO ─────────────────────────────────────────────────────────────
  10  | 
  11  |   test('@smoke POST /register - devuelve 201 y token JWT válido', async ({ request }) => {
  12  |     const unique = Date.now()
  13  |     const res = await request.post(`${BASE}/api/auth/register`, {
  14  |       data: { name: 'API Test User', email: `api_${unique}@cryptogamer.test`, password: 'TestPass123!' },
  15  |     })
  16  | 
  17  |     expect(res.status()).toBe(201)
  18  |     const body = await res.json()
  19  |     expect(body).toHaveProperty('token')
  20  |     expect(typeof body.token).toBe('string')
  21  |     expect(body.token.split('.')).toHaveLength(3)
  22  |   })
  23  | 
  24  |   test('@regression POST /register - email duplicado devuelve 409', async ({ request }) => {
  25  |     const email = `dup_${Date.now()}@cryptogamer.test`
  26  |     await request.post(`${BASE}/api/auth/register`, {
  27  |       data: { name: 'User 1', email, password: 'TestPass123!' },
  28  |     })
  29  |     const res = await request.post(`${BASE}/api/auth/register`, {
  30  |       data: { name: 'User 2', email, password: 'TestPass123!' },
  31  |     })
  32  | 
  33  |     expect(res.status()).toBe(409)
  34  |     const body = await res.json()
  35  |     expect(body).not.toHaveProperty('token')
  36  |   })
  37  | 
  38  |   test('@regression POST /register - body vacío devuelve 4xx', async ({ request }) => {
  39  |     const res = await request.post(`${BASE}/api/auth/register`, { data: {} })
  40  |     expect(res.status()).toBeGreaterThanOrEqual(400)
  41  |     expect(res.status()).toBeLessThan(500)
  42  |   })
  43  | 
  44  |   test('@regression POST /register - password no se expone en la respuesta', async ({ request }) => {
  45  |     const unique = Date.now()
  46  |     const res = await request.post(`${BASE}/api/auth/register`, {
  47  |       data: { name: 'Secure User', email: `sec_${unique}@cryptogamer.test`, password: 'TestPass123!' },
  48  |     })
  49  | 
  50  |     const body = await res.json()
  51  |     expect(body.user).not.toHaveProperty('password')
  52  |     expect(JSON.stringify(body)).not.toContain('TestPass123!')
  53  |   })
  54  | 
  55  |   // ─── LOGIN ────────────────────────────────────────────────────────────────
  56  | 
  57  |   test('@smoke POST /login - credenciales válidas devuelve token JWT', async ({ request }) => {
  58  |     const res = await request.post(`${BASE}/api/auth/login`, {
  59  |       data: { email: EMAIL, password: PASS },
  60  |     })
  61  | 
> 62  |     expect(res.status()).toBe(200)
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  63  |     const body = await res.json()
  64  |     expect(body).toHaveProperty('token')
  65  |     expect(body.token.split('.')).toHaveLength(3)
  66  |     expect(body.user).not.toHaveProperty('password')
  67  |   })
  68  | 
  69  |   test('@regression POST /login - contraseña incorrecta devuelve 401', async ({ request }) => {
  70  |     const res = await request.post(`${BASE}/api/auth/login`, {
  71  |       data: { email: EMAIL, password: 'WrongPassword999' },
  72  |     })
  73  | 
  74  |     expect(res.status()).toBe(401)
  75  |     const body = await res.json()
  76  |     expect(body).not.toHaveProperty('token')
  77  |     expect(body).toHaveProperty('message')
  78  |   })
  79  | 
  80  |   test('@regression POST /login - email inexistente devuelve 401', async ({ request }) => {
  81  |     const res = await request.post(`${BASE}/api/auth/login`, {
  82  |       data: { email: 'noexiste@example.com', password: 'AnyPass123' },
  83  |     })
  84  |     expect(res.status()).toBe(401)
  85  |   })
  86  | 
  87  |   test('@regression POST /login - body vacío devuelve 4xx', async ({ request }) => {
  88  |     const res = await request.post(`${BASE}/api/auth/login`, { data: {} })
  89  |     expect(res.status()).toBeGreaterThanOrEqual(400)
  90  |     expect(res.status()).toBeLessThan(500)
  91  |   })
  92  | 
  93  |   // ─── /ME ──────────────────────────────────────────────────────────────────
  94  | 
  95  |   test('@regression GET /me - con token válido devuelve datos del usuario', async ({ request }) => {
  96  |     const loginRes = await request.post(`${BASE}/api/auth/login`, {
  97  |       data: { email: EMAIL, password: PASS },
  98  |     })
  99  |     const { token } = await loginRes.json()
  100 | 
  101 |     const res = await request.get(`${BASE}/api/auth/me`, {
  102 |       headers: { Authorization: `Bearer ${token}` },
  103 |     })
  104 | 
  105 |     expect(res.status()).toBe(200)
  106 |     const body = await res.json()
  107 |     expect(body).toHaveProperty('email', EMAIL)
  108 |     expect(body).toHaveProperty('name')
  109 |     expect(body).not.toHaveProperty('password')
  110 |   })
  111 | 
  112 |   test('@regression GET /me - sin token devuelve 401', async ({ request }) => {
  113 |     const res = await request.get(`${BASE}/api/auth/me`)
  114 |     expect(res.status()).toBe(401)
  115 |   })
  116 | 
  117 |   test('@regression GET /me - token inválido devuelve 401', async ({ request }) => {
  118 |     const res = await request.get(`${BASE}/api/auth/me`, {
  119 |       headers: { Authorization: 'Bearer token.falso.invalido' },
  120 |     })
  121 |     expect(res.status()).toBe(401)
  122 |   })
  123 | 
  124 |   test('@regression GET /me - token sin prefijo Bearer devuelve 401', async ({ request }) => {
  125 |     const loginRes = await request.post(`${BASE}/api/auth/login`, {
  126 |       data: { email: EMAIL, password: PASS },
  127 |     })
  128 |     const { token } = await loginRes.json()
  129 | 
  130 |     const res = await request.get(`${BASE}/api/auth/me`, {
  131 |       headers: { Authorization: token },
  132 |     })
  133 |     expect(res.status()).toBe(401)
  134 |   })
  135 | })
  136 | 
```
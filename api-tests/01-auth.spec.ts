import { test, expect } from '@playwright/test'

const BASE = process.env.API_URL ?? 'http://localhost:3001'
const EMAIL = process.env.TEST_USER_EMAIL ?? 'testuser@cryptogamer.test'
const PASS  = process.env.TEST_USER_PASSWORD ?? 'TestPass123!'

// Token compartido entre tests del mismo archivo
let authToken = ''

test.describe('Auth API', () => {

  test('@smoke POST /register - devuelve 201 y token', async ({ request }) => {
    const unique = Date.now()
    const res = await request.post(`${BASE}/api/auth/register`, {
      data: { name: 'API Test User', email: `api_${unique}@cryptogamer.test`, password: 'TestPass123!' },
    })

    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('token')
    expect(typeof body.token).toBe('string')
    expect(body.token.split('.')).toHaveLength(3) // formato JWT válido
  })

  test('@smoke POST /login - credenciales válidas devuelve token JWT', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: EMAIL, password: PASS },
    })

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('token')
    expect(body.token.split('.')).toHaveLength(3)
    // El usuario no debe exponer su password
    expect(body.user).not.toHaveProperty('password')
    authToken = body.token
  })

  test('@regression POST /login - contraseña incorrecta devuelve 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: EMAIL, password: 'WrongPassword999' },
    })

    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body).not.toHaveProperty('token')
    expect(body).toHaveProperty('message')
  })

  test('@regression POST /login - email inexistente devuelve 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'noexiste@example.com', password: 'AnyPass123' },
    })

    expect(res.status()).toBe(401)
  })

  test('@regression POST /login - body vacío devuelve 4xx', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, { data: {} })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('@regression GET /me - con token válido devuelve datos del usuario', async ({ request }) => {
    // Login primero para obtener token
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { email: EMAIL, password: PASS },
    })
    const { token } = await loginRes.json()

    const res = await request.get(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('email', EMAIL)
    expect(body).toHaveProperty('name')
    expect(body).not.toHaveProperty('password')
  })

  test('@regression GET /me - sin token devuelve 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/auth/me`)
    expect(res.status()).toBe(401)
  })

  test('@regression GET /me - token inválido devuelve 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/auth/me`, {
      headers: { Authorization: 'Bearer token.falso.invalido' },
    })
    expect(res.status()).toBe(401)
  })
})

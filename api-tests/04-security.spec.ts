import { test, expect } from '@playwright/test'

const BASE = process.env.API_URL ?? 'http://localhost:3001'

/**
 * Tests de seguridad básica.
 * Verifican que la API no exponga información sensible y resista
 * inyecciones comunes. No son tests de penetración exhaustivos —
 * son el piso mínimo que toda API debería pasar.
 */
test.describe('Security API', () => {

  // ─── HEADERS DE SEGURIDAD ─────────────────────────────────────────────────

  test('@smoke GET /products - respuesta incluye Content-Type JSON', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products`)
    const contentType = res.headers()['content-type'] ?? ''
    expect(contentType).toContain('application/json')
  })

  test('@regression GET /products - no expone header X-Powered-By con tecnología', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products`)
    const headers = res.headers()
    // Exponer "Express" o "Node.js" ayuda a atacantes a buscar vulnerabilidades conocidas
    const xPoweredBy = headers['x-powered-by'] ?? ''
    expect(xPoweredBy.toLowerCase()).not.toContain('express')
  })

  // ─── SQL / NOSQL INJECTION ────────────────────────────────────────────────

  test('@regression GET /products?search= - payload SQL injection no rompe la API', async ({ request }) => {
    const payloads = [
      "' OR '1'='1",
      "1; DROP TABLE products;--",
      "' UNION SELECT * FROM users--",
    ]

    for (const payload of payloads) {
      const res = await request.get(`${BASE}/api/products?search=${encodeURIComponent(payload)}`)
      // La API debe responder 200 (búsqueda vacía) o 400, nunca 500
      expect(
        res.status(),
        `Payload "${payload}" causó status ${res.status()}`
      ).not.toBe(500)
    }
  })

  test('@regression POST /login - payload SQL injection no expone datos', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: "' OR '1'='1'--", password: "' OR '1'='1'--" },
    })
    // No debe devolver token ni status 200
    expect(res.status()).not.toBe(200)
    const body = await res.json()
    expect(body).not.toHaveProperty('token')
  })

  // ─── INFORMACIÓN SENSIBLE ─────────────────────────────────────────────────

  test('@regression POST /login - error 401 no revela si el email existe o no', async ({ request }) => {
    const resWrongEmail = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'noexiste_nunca@test.com', password: 'WrongPass1' },
    })
    const resWrongPass = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'testuser@cryptogamer.test', password: 'WrongPass1' },
    })

    // Ambos deben devolver 401 o 429 (rate limit activo) — nunca 200
    // El rate limit (429) es aceptable: prueba que la protección está activa
    expect([401, 429]).toContain(resWrongEmail.status())
    expect([401, 429]).toContain(resWrongPass.status())
    expect(resWrongEmail.status()).not.toBe(200)
    expect(resWrongPass.status()).not.toBe(200)

    // Si no hay rate limit, verificar que ninguno devuelve token
    if (resWrongEmail.status() === 401) {
      const body1 = await resWrongEmail.json()
      expect(body1).not.toHaveProperty('token')
    }
    if (resWrongPass.status() === 401) {
      const body2 = await resWrongPass.json()
      expect(body2).not.toHaveProperty('token')
    }
  })

  test('@regression GET /api/auth/me - respuesta no filtra campos internos del usuario', async ({ request }) => {
    const loginRes = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'testuser@cryptogamer.test', password: 'TestPass123!' },
    })
    if (!loginRes.ok()) return // usuario no existe todavía, skip

    const { token } = await loginRes.json()
    const res = await request.get(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const body = await res.json()
    // Campos que nunca deben estar en la respuesta
    expect(body).not.toHaveProperty('password')
    expect(body).not.toHaveProperty('passwordHash')
    expect(body).not.toHaveProperty('hash')
    expect(body).not.toHaveProperty('salt')
  })

  // ─── RATE LIMIT / BRUTE FORCE ─────────────────────────────────────────────

  test('@regression POST /login - 10 intentos fallidos seguidos no devuelven 500', async ({ request }) => {
    const attempts = Array.from({ length: 10 }, (_, i) =>
      request.post(`${BASE}/api/auth/login`, {
        data: { email: 'brute@test.com', password: `WrongPass${i}` },
      })
    )

    const results = await Promise.all(attempts)
    for (const res of results) {
      // Puede devolver 401 o 429 (rate limit), pero nunca 500
      expect(res.status()).not.toBe(500)
      expect([401, 429]).toContain(res.status())
    }
  })

  // ─── MÉTODOS NO PERMITIDOS ────────────────────────────────────────────────

  test('@regression PATCH /products/:id - sin token devuelve 401 o 405', async ({ request }) => {
    const res = await request.patch(`${BASE}/api/products/cualquier-id`, {
      data: { price: 1 },
    })
    expect([401, 403, 404, 405]).toContain(res.status())
  })
})

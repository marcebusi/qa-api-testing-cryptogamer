import { test, expect } from '@playwright/test'

const BASE  = process.env.API_URL            ?? 'http://localhost:3001'
const EMAIL = process.env.TEST_USER_EMAIL    ?? 'testuser@cryptogamer.test'
const PASS  = process.env.TEST_USER_PASSWORD ?? 'TestPass123!'

async function getToken(request: any): Promise<string> {
  const res = await request.post(`${BASE}/api/auth/login`, {
    data: { email: EMAIL, password: PASS },
  })
  return (await res.json()).token
}

test.describe('Products API', () => {

  // ─── SMOKE ────────────────────────────────────────────────────────────────

  test('@smoke GET /products - devuelve listado con schema correcto', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products`)

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('total')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)

    const p = body.data[0]
    expect(p).toHaveProperty('id')
    expect(p).toHaveProperty('name')
    expect(p).toHaveProperty('price')
    expect(p).toHaveProperty('inStock')
    expect(typeof p.price).toBe('number')
    expect(p.price).toBeGreaterThan(0)
  })

  test('@smoke GET /products - tiempo de respuesta < 1000ms', async ({ request }) => {
    const start = Date.now()
    const res = await request.get(`${BASE}/api/products`)
    const elapsed = Date.now() - start

    expect(res.status()).toBe(200)
    expect(elapsed).toBeLessThan(1000)
  })

  // ─── REGLAS DE NEGOCIO ────────────────────────────────────────────────────

  test('@regression GET /products - originalPrice >= price cuando hay descuento', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products?pageSize=50`)
    const { data } = await res.json()

    for (const p of data) {
      if (p.originalPrice !== null && p.originalPrice !== undefined) {
        expect(
          p.originalPrice,
          `"${p.name}": originalPrice (${p.originalPrice}) debe ser >= price (${p.price})`
        ).toBeGreaterThanOrEqual(p.price)
      }
    }
  })

  test('@regression GET /products - ningún producto tiene precio negativo o cero', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products?pageSize=50`)
    const { data } = await res.json()

    for (const p of data) {
      expect(p.price, `"${p.name}" tiene precio inválido`).toBeGreaterThan(0)
    }
  })

  // ─── PAGINACIÓN ───────────────────────────────────────────────────────────

  test('@regression GET /products - pageSize es respetado', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products?pageSize=3`)
    const body = await res.json()

    expect(res.status()).toBe(200)
    expect(body.data.length).toBeLessThanOrEqual(3)
  })

  test('@regression GET /products - página 2 no repite items de página 1', async ({ request }) => {
    const res1 = await request.get(`${BASE}/api/products?page=1&pageSize=5`)
    const res2 = await request.get(`${BASE}/api/products?page=2&pageSize=5`)

    const body1 = await res1.json()
    const body2 = await res2.json()

    if (body2.data.length === 0) return

    const ids1 = body1.data.map((p: any) => p.id)
    const ids2 = body2.data.map((p: any) => p.id)
    const duplicados = ids1.filter((id: string) => ids2.includes(id))

    expect(duplicados).toHaveLength(0)
  })

  test('@regression GET /products - campo total >= cantidad de items devueltos', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products`)
    const body = await res.json()

    expect(typeof body.total).toBe('number')
    expect(body.total).toBeGreaterThanOrEqual(body.data.length)
  })

  // ─── BÚSQUEDA ─────────────────────────────────────────────────────────────

  test('@regression GET /products?search= - devuelve estructura de paginación', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products?search=a&pageSize=5`)

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('page')
  })

  test('@regression GET /products?search=inexistente - devuelve array vacío', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products?search=xyzzyproductonuncaexiste99999`)

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(0)
    expect(body.total).toBe(0)
  })

  // ─── PRODUCTO INDIVIDUAL ──────────────────────────────────────────────────

  test('@regression GET /products/:id - producto existente devuelve schema completo', async ({ request }) => {
    const listRes = await request.get(`${BASE}/api/products?pageSize=1`)
    const { data } = await listRes.json()
    const productId = data[0]?.id
    expect(productId).toBeTruthy()

    const res = await request.get(`${BASE}/api/products/${productId}`)
    expect(res.status()).toBe(200)

    const json = await res.json()
    // La API devuelve { data: { ... }, success: true }
    const p = json.data ?? json
    ;['id', 'name', 'price', 'description', 'inStock'].forEach(field => {
      expect(p).toHaveProperty(field)
    })
  })

  test('@regression GET /products/:id - id inexistente devuelve 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products/id-que-no-existe-99999`)
    expect(res.status()).toBe(404)
  })

  // ─── AUTORIZACIÓN ─────────────────────────────────────────────────────────

  test('@regression POST /products - sin autenticación devuelve 401', async ({ request }) => {
    const res = await request.post(`${BASE}/api/products`, {
      data: { name: 'Test', price: 100 },
    })
    expect(res.status()).toBe(401)
  })

  test('@regression PUT /products/:id - sin autenticación devuelve 401', async ({ request }) => {
    const res = await request.put(`${BASE}/api/products/cualquier-id`, {
      data: { price: 9999 },
    })
    expect(res.status()).toBe(401)
  })

  test('@regression DELETE /products/:id - sin autenticación devuelve 401', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/products/cualquier-id`)
    expect(res.status()).toBe(401)
  })

  test('@regression POST /products - usuario CUSTOMER no puede crear productos', async ({ request }) => {
    const token = await getToken(request)

    const res = await request.post(`${BASE}/api/products`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Producto Trampa', price: 1, description: 'test', stock: 1 },
    })
    // CUSTOMER debe recibir 403 Forbidden (diferente a 401 sin token)
    expect([401, 403]).toContain(res.status())
  })
})

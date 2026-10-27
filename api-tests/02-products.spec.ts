import { test, expect } from '@playwright/test'

const BASE = process.env.API_URL ?? 'http://localhost:3001'

test.describe('Products API', () => {

  test('@smoke GET /products - devuelve listado con schema correcto', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products`)

    expect(res.status()).toBe(200)
    const body = await res.json()

    // Schema de paginación
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('total')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body.data.length).toBeGreaterThan(0)

    // Schema de cada producto
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

  test('@regression GET /products - regla de negocio: originalPrice >= price', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products?pageSize=50`)
    const { data } = await res.json()

    for (const p of data) {
      if (p.originalPrice !== null && p.originalPrice !== undefined) {
        expect(
          p.originalPrice,
          `Producto "${p.name}": originalPrice (${p.originalPrice}) debe ser >= price (${p.price})`
        ).toBeGreaterThanOrEqual(p.price)
      }
    }
  })

  test('@regression GET /products?search= - búsqueda devuelve paginación', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products?search=a&pageSize=5`)

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('data')
    expect(body).toHaveProperty('total')
    expect(body).toHaveProperty('page')
  })

  test('@regression GET /products/:id - producto existente devuelve schema completo', async ({ request }) => {
    // Primero obtenemos un id real
    const listRes = await request.get(`${BASE}/api/products?pageSize=1`)
    const { data } = await listRes.json()
    const productId = data[0]?.id
    expect(productId).toBeTruthy()

    const res = await request.get(`${BASE}/api/products/${productId}`)
    expect(res.status()).toBe(200)

    const p = await res.json()
    ;['id', 'name', 'price', 'description', 'inStock'].forEach(field => {
      expect(p).toHaveProperty(field)
    })
  })

  test('@regression GET /products/:id - id inexistente devuelve 404', async ({ request }) => {
    const res = await request.get(`${BASE}/api/products/id-que-no-existe-99999`)
    expect(res.status()).toBe(404)
  })

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
})

import { request } from '@playwright/test'

const BASE  = process.env.API_URL      ?? 'http://localhost:3001'
const EMAIL = process.env.TEST_USER_EMAIL    ?? 'testuser@cryptogamer.test'
const PASS  = process.env.TEST_USER_PASSWORD ?? 'TestPass123!'
const NAME  = 'API Test User'

async function globalSetup() {
  const context = await request.newContext({ baseURL: BASE })

  const res = await context.post('/api/auth/register', {
    data: { name: NAME, email: EMAIL, password: PASS },
  })

  if (res.status() === 201) {
    console.log(`\n✅ Usuario de prueba creado: ${EMAIL}`)
  } else if (res.status() === 409) {
    console.log(`\nℹ️  Usuario de prueba ya existe: ${EMAIL}`)
  } else if (res.status() === 429) {
    // Rate limit activo — el usuario probablemente ya existe de una corrida anterior
    console.log(`\n⚠️  Rate limit activo en /register. Asumiendo que el usuario ya existe: ${EMAIL}`)
  } else {
    const body = await res.text()
    throw new Error(`No se pudo crear el usuario de prueba (${res.status()}): ${body}`)
  }

  await context.dispose()
}

export default globalSetup

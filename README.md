# qa-api-testing-cryptogamer

![Playwright](https://img.shields.io/badge/Playwright-API%20Testing-45ba4b?logo=playwright)
![Newman](https://img.shields.io/badge/Newman-Postman%20CLI-FF6C37?logo=postman)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![CI](https://github.com/marcebusi/qa-api-testing-cryptogamer/actions/workflows/api-tests.yml/badge.svg)

Proyecto 2 del portfolio de QA — Testing de API REST con Playwright (request fixture) y Newman (Postman CLI).

**Aplicación bajo prueba**: [cryptogamer-ecommerce](https://github.com/marcebusi/cryptogamer-ecommerce) — e-commerce de productos gaming con backend Node.js + Prisma + SQLite.

---

## Estrategia de testing

Este proyecto combina **dos herramientas** para cubrir distintos aspectos del contrato de API:

| Herramienta | Cobertura | Tags |
|---|---|---|
| Playwright `request` | Tests funcionales con lógica TypeScript | `@smoke`, `@regression` |
| Newman / Postman | Colección portable, chain de variables entre requests | — |

### Por qué dos herramientas

- **Playwright API**: ideal cuando los tests tienen lógica condicional, loops de validación o dependen de fixtures TypeScript. Integra con el mismo CI que los tests E2E del Proyecto 1.
- **Newman**: la colección Postman puede correr sin instalar Node.js y se comparte fácilmente con el equipo de desarrollo como documentación viva de la API.

---

## Tests implementados

### Playwright API Tests

| Archivo | Tests | Tags |
|---|---|---|
| `api-tests/01-auth.spec.ts` | 11 | `@smoke`, `@regression` |
| `api-tests/02-products.spec.ts` | 14 | `@smoke`, `@regression` |
| `api-tests/03-orders.spec.ts` | 8 | `@smoke`, `@regression` |
| `api-tests/04-security.spec.ts` | 8 | `@smoke`, `@regression` |
| **Total** | **41** | |

**Casos clave:**
- JWT válido: 3 partes separadas por `.`
- Password no expuesto en ninguna respuesta ni en texto de error
- Regla de negocio: `originalPrice >= price` en todos los productos con descuento
- Ningún producto con precio negativo o cero
- Paginación: pageSize respetado, página 2 sin duplicados de página 1
- Búsqueda sin resultados devuelve array vacío (no 404)
- Rutas protegidas devuelven `401` sin token, con token inválido y sin prefijo Bearer
- Aislamiento de usuarios: un usuario no ve las órdenes de otro
- Status de órdenes: solo valores válidos del enum
- SQL injection en search y login no causa error 500
- User enumeration: error 401 genérico sin revelar si el email existe
- Rate limit: 10 logins fallidos seguidos no causan 500
- Header `X-Powered-By` no expone tecnología al atacante
- Usuario CUSTOMER no puede crear/editar/borrar productos

### Postman Collection (Newman)

14 requests en 3 carpetas: **Auth** (6), **Productos** (5), **Órdenes** (3).

Características:
- `pm.collectionVariables.set('token', ...)` propaga el JWT entre requests
- Tests de schema, reglas de negocio y tiempos de respuesta en cada request
- Archivo de environment separado para fácil cambio de entorno

---

## Prerequisitos

- Node.js 18+
- Backend de cryptogamer-ecommerce corriendo en `http://localhost:3001`

Para correr el backend:

```bash
cd cryptogamer-ecommerce/backend
npm install
npm run dev
```

---

## Instalación

```bash
git clone https://github.com/marcebusi/qa-api-testing-cryptogamer.git
cd qa-api-testing-cryptogamer
npm install
npx playwright install --with-deps chromium
```

Copiar variables de entorno:

```bash
cp .env.example .env
```

---

## Cómo correr los tests

### Smoke tests (camino crítico)

```bash
npm run test:smoke
```

### Regression completa

```bash
npm run test:regression
```

### Todos los tests con reporte HTML

```bash
npm test
npx playwright show-report
```

### Newman (colección Postman)

```bash
# Registrar usuario de prueba primero
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"testuser@cryptogamer.test","password":"TestPass123!"}'

# Correr colección
npm run newman
```

---

## Estructura del proyecto

```
qa-api-testing-cryptogamer/
├── api-tests/
│   ├── 01-auth.spec.ts         # 8 tests — autenticación
│   ├── 02-products.spec.ts     # 9 tests — catálogo de productos
│   └── 03-orders.spec.ts       # 6 tests — órdenes
├── postman/
│   ├── cryptogamer-api.collection.json   # Colección Postman v2.1
│   └── environment.json                  # Variables de entorno
├── .github/workflows/
│   └── api-tests.yml           # CI: Playwright + Newman en paralelo
├── playwright.config.ts
├── tsconfig.json
├── .env.example
└── package.json
```

---

## CI/CD

El pipeline corre dos jobs en paralelo:

1. **playwright-api** — smoke en PR, smoke + regression en push a main
2. **newman** — colección Postman completa en cada push

Los reportes HTML se suben como artifacts y quedan disponibles por 30 días.

---

## Decisiones técnicas

**¿Por qué Playwright para API y no solo Newman?**
Newman es una herramienta excelente pero los scripts de test en Postman son JavaScript plano sin tipos. Playwright con TypeScript permite validaciones más expresivas, mejor autocompletado y reutilización de helpers tipados.

**¿Por qué mantener la colección Postman de todas formas?**
El equipo de desarrollo puede importarla directamente y ejecutar requests manuales durante el desarrollo, sin necesidad de conocer TypeScript. Es documentación ejecutable.

**Separación smoke / regression:**
Los smoke tests (≈ 5 tests críticos) corren en cada PR para dar feedback rápido. La suite de regression completa (23 tests) corre solo en push a `main` para no bloquear el flujo de trabajo.

---

## Proyectos relacionados

| # | Proyecto | Repo |
|---|---|---|
| 1 | E2E con Playwright + TypeScript | [qa-playwright-cryptogamer](https://github.com/marcebusi/qa-playwright-cryptogamer) |
| 2 | API Testing con Playwright + Newman | ← este repo |

---

## Autor

**Marcelo Busignani** — QA Engineer  
[LinkedIn](https://www.linkedin.com/in/marcelo-busignani/) · [GitHub](https://github.com/marcebusi)

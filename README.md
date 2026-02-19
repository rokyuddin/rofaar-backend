# Rofaar Backend

> E-commerce REST API — **Fastify v5 · TypeScript · Drizzle ORM · PostgreSQL · Zod**

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Fastify v5 |
| Language | TypeScript (strict) |
| ORM | Drizzle ORM (postgres.js driver) |
| Validation | Zod + `fastify-type-provider-zod` |
| Auth | `@fastify/jwt` (JWT RS256) |
| Architecture | Modular Monolith (feature-based) |

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy env and fill in values
cp .env.example .env

# Push schema to DB (Postgres must be running)
pnpm db:push

# Start dev server with hot reload
pnpm dev
```

Server starts at `http://localhost:3000`. Health check: `GET /health`.

## Project Structure

```
src/
  app.ts              # Fastify app factory
  server.ts           # Entry point + graceful shutdown
  config/
    env.ts            # Zod-validated env vars
    db.ts             # Drizzle client singleton
  db/
    schema/           # One file per domain entity (13 tables)
    index.ts          # Schema barrel for Drizzle relational queries
  plugins/
    auth.ts           # @fastify/jwt + authenticate/adminOnly decorators
    error-handler.ts  # Global error handler
  modules/
    auth/             # Register, Login, /me
    products/         # List + single product
    cart/             # Full CRUD + stock validation
    orders/           # Create order (transaction), list, detail
    categories/       # Public list
    wishlist/         # Add / remove / list
  shared/
    errors.ts         # AppError hierarchy
    response.ts       # success() / paginated() helpers
    types.ts          # Shared Zod schemas (UUIDs, pagination)
```

## Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Dev server with hot reload (tsx watch) |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run compiled production server |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm db:generate` | Generate Drizzle migration files |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:push` | Push schema directly (dev only) |
| `pnpm db:studio` | Open Drizzle Studio |

## API Overview

Base URL: `https://api.rofaar.com/api/v1`

Auth: `Authorization: Bearer <token>`

See [`docs/api.md`](docs/api.md) for the full endpoint reference.

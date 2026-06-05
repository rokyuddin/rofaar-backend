# AGENTS.md

## Quick Reference

```bash
pnpm install              # install deps (pnpm, not npm)
pnpm dev                  # dev server (tsx watch, hot reload)
pnpm build                # tsc + tsc-alias → dist/
pnpm start                # node dist/server.js
pnpm typecheck            # tsc --noEmit (must pass before PR)
pnpm lint                 # eslint src --ext .ts
pnpm test                 # vitest run
pnpm db:push              # push schema to DB (dev only)
pnpm db:generate          # generate Drizzle migration files
pnpm db:migrate           # apply migrations
pnpm db:studio            # open Drizzle Studio
```

## Architecture

- **Fastify v5** modular monolith, feature-based directory structure
- **TypeScript strict** — `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitReturns` are all enabled
- **Drizzle ORM** with postgres.js driver; schema barrel at `src/db/index.ts`
- **Zod** validation via `fastify-type-provider-zod` (auto-validates request/response schemas)
- All API routes live under `/api/v1` prefix
- **File uploads**: `@fastify/multipart` + Cloudflare R2 (via `src/shared/services/upload.ts`)
- **Auth**: `@fastify/jwt` (HS256), RBAC via `permissionService` in `src/shared/permission.service.ts`

## Path Alias

`@/` → `src/` (configured in tsconfig.json and vitest.config.ts). Always use `@/` imports, not relative paths across modules.

## Module Pattern

Each feature module in `src/modules/<name>/` follows this structure:

| File | Purpose |
|------|---------|
| `routes.ts` | Fastify plugin — defines routes with Zod schemas |
| `service.ts` | Business logic + DB queries |
| `schema.ts` | Zod schemas for request/response types |

Public routes go in a `fastify.register(async (instance) => { ... }, { prefix: '/<module>' })` block. Admin routes go in a separate block with `prefix: '/admin/<module>'`.

**Current modules**: `auth`, `products`, `categories`, `brands`, `banners`, `advertisements`, `contact`, `cart`, `orders`, `wishlist`, `addresses`, `coupons`, `reviews`, `admin`, `payments`, `shipping`, `refunds`, `inventory`, `users`, `qa`, `search`, `rbac`, `steadfast`, `counts`, `uploads`

## Auth & Permissions

Auth decorators are registered in `src/plugins/auth.ts`:

- `fastify.authenticate` — verifies JWT, loads user permissions from DB
- `fastify.requirePermission(action, resource)` — factory for preHandler that checks RBAC
- `fastify.adminOnly` — allows `super_admin` and `admin` roles
- `fastify.superAdminOnly` — only `super_admin` role

Usage in routes:
```ts
// Single route
app.get("/", { preHandler: [fastify.requirePermission("read", "products")] });

// All routes in a block
app.addHook("onRequest", fastify.authenticate);
```

## Response Convention

Use reply decorators (not raw `reply.send()`):

- `reply.sendOk(data)` — 200 with `{ success: true, data }`
- `reply.sendOk(data, "message")` — same with message
- `reply.sendCreated(data)` — 201 with `{ success: true, data }`
- `reply.sendPaginated(rows, { page, limit, total })` — 200 with pagination envelope

## Error Handling

Throw `AppError` subclasses from `src/shared/errors.ts`:

- `NotFoundError`, `UnauthorizedError`, `ForbiddenError`
- `ValidationError`, `BadRequestError`, `ConflictError`

The global error handler (`src/plugins/error-handler.ts`) converts these + `ZodError` into the standard `{ success: false, code, message, errors? }` envelope.

## Environment

Env is validated at startup via Zod in `src/config/env.ts`. If any required var is missing, the process exits immediately. See `.env.example` for all vars.

Key vars: `DATABASE_URL`, `JWT_SECRET` (min 32 chars), `NODE_ENV`, `PORT`.
Optional: `ENABLE_SWAGGER`, `API_HOST`, `R2_*`, `STEADFAST_*`

## Database

- Drizzle config: `drizzle.config.ts` — schema source is `./src/db/index.ts`, migrations output to `./drizzle`
- In dev: use `pnpm db:push` (no migration files needed)
- In prod: use `pnpm db:generate` then `pnpm db:migrate`
- DB client singleton: `src/config/db.ts`
- 27 schema files under `src/db/schema/` (user, category, product, cart, address, coupon, order, order_history, wishlist, review, inventory, refund, payment, rbac, brand, marketing, contact, otp, shipping, product_view, product_qa, session, log, tag)

## Testing

- **Vitest** with `globals: true` (no need to import `describe`/`it`/`expect`)
- Mock `@/config/db.js` and services with `vi.mock()`
- Tests live next to their service files as `service.test.ts`
- Test files: `src/modules/products/service.test.ts`, `src/modules/addresses/service.test.ts`
- Run single test: `pnpm test -- src/modules/products/service.test.ts`

## TypeScript Strictness Gotchas

- `exactOptionalPropertyTypes`: `prop?: value` is NOT the same as `prop: value | undefined`. You must write `prop: value | undefined` explicitly.
- `noUncheckedIndexedAccess`: array/object index access returns `T | undefined`. Always check before use.
- All imports use `.js` extension (required by `NodeNext` module resolution): `import { db } from "@/config/db.js"`.

## Build

- Dev: `tsx watch src/server.ts` (fast, no build step)
- Build: `tsc --project tsconfig.json && tsc-alias -p tsconfig.json` (tsc-alias resolves `@/` paths in dist/)
- Entry: `dist/server.js`

## Deployment

- **Render** (see `render.yaml`): `pnpm install && pnpm build` → `pnpm db:migrate && pnpm start`
- **Docker** (see `docker-compose.yml`): API + PostgreSQL 16, health-checked

## Adding a New Module

1. Create `src/modules/<name>/` with `routes.ts`, `service.ts`, `schema.ts`
2. Export a `FastifyPluginAsync` from `routes.ts`
3. Register it in `src/app.ts` under the `/api/v1` prefix
4. Add schema to `src/db/index.ts` barrel if new tables are needed
5. Generate migration with `pnpm db:generate`

## Swagger / API Docs

- Plugin: `src/plugins/swagger.ts` (enabled via `ENABLE_SWAGGER=true`)
- Dev UI: `http://localhost:3000/documentation`
- Schemas use Zod via `fastify-type-provider-zod`
- Tags organize by feature: `["Products"]`, `["Admin | Products"]`, etc.

## Shared Utilities

- `src/shared/errors.ts` — `AppError` hierarchy
- `src/shared/response.ts` — `success()`, `paginated()`, `apiError()`, `sendOk()`, `sendCreated()`, `sendPaginated()`
- `src/shared/types.ts` — shared Zod schemas (`UuidSchema`, `PaginationQuerySchema`, `IdParamSchema`, `SlugParamSchema`)
- `src/shared/permission.service.ts` — RBAC logic (`PermissionService`, `can()`, `getUserPermissions()`)
- `src/shared/services/upload.ts` — Cloudflare R2 upload/delete
- `src/shared/services/logger.ts` — pino logger wrapper
- `src/shared/utils.ts` — misc helpers

## Plugin Load Order (in app.ts)

1. `zodPlugin` — type provider
2. `responsePlugin` — reply decorators
3. `cookie` — JWT cookie parsing
4. `multipart` — file uploads
5. `authPlugin` — JWT + RBAC decorators (must be early)
6. `swaggerPlugin` — OpenAPI
7. `errorHandlerPlugin` — global error handler
8. `cors`, `helmet`, `rateLimit` — utility plugins
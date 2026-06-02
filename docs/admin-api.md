# Rofaar API — Admin Guide

Step-by-step reference for store operators and administrators. Requires an account with role `admin`, `operator`, or `super_admin` (permissions vary by role).

| Environment | Base URL |
|-------------|----------|
| Development | `http://localhost:3000/api/v1` |
| Production  | `https://api.rofaar.com/api/v1` |

---

## Table of contents

1. [Conventions & access control](#1-conventions--access-control)
2. [Admin authentication](#2-admin-authentication)
3. [Dashboard & analytics](#3-dashboard--analytics)
4. [Products](#4-products)
5. [Categories & brands](#5-categories--brands)
6. [Marketing (banners & ads)](#6-marketing-banners--ads)
7. [Inventory](#7-inventory)
8. [Shipping](#8-shipping)
9. [Coupons](#9-coupons)
10. [Orders (fulfillment)](#10-orders-fulfillment)
11. [Refunds](#11-refunds)
12. [Users](#12-users)
13. [Roles & permissions (RBAC)](#13-roles--permissions-rbac)
14. [Reviews moderation](#14-reviews-moderation)
15. [Contact submissions](#15-contact-submissions)
16. [Product Q&A](#16-product-qa)
17. [Cart management](#17-cart-management)
18. [Steadfast Courier](#18-steadfast-courier)
19. [Uploads](#19-uploads)
20. [Operational playbook](#20-operational-playbook)
21. [Quick reference](#21-quick-reference)

---

## 1. Conventions & access control

### Response format (all routes)

All handlers use `reply.sendOk()`, `reply.sendCreated()`, or `reply.sendPaginated()` from `src/plugins/response.ts`.

**Success:** `{ "success": true, "message?": "...", "data": ... }`
**Paginated:** `{ "success": true, "data": [], "pagination": { page, limit, total, totalPages } }`
**Error:** `{ "success": false, "code": "...", "message": "...", "errors?": {} }`

### Authentication

Every admin route requires:

```http
Authorization: Bearer <access_token>
```

### Authorization layers

| Mechanism | When used |
|-----------|-----------|
| `adminOnly` | Dashboard, users, RBAC, inventory, shipping, Steadfast — must be `admin` or `super_admin` |
| `requirePermission(action, resource)` | Granular RBAC per route (e.g. `create` + `products`) |
| `super_admin` | Wildcard `manage` + `*` — all permissions |

### Error codes

| HTTP | Code | Typical cause |
|------|------|----------------|
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 403 | `FORBIDDEN` | Valid token but insufficient permission |
| 404 | `NOT_FOUND` | Resource missing |
| 400 | `BAD_REQUEST` | Business rule violation |
| 409 | `CONFLICT` | Duplicate resource |

---

## 2. Admin authentication

Staff use the same auth module as customers, with a dedicated login endpoint.

### Admin / operator login

```http
POST /auth/admin/login
Content-Type: application/json
```

**Body:**

```json
{
  "phone": "01700000000",
  "password": "adminPassword123"
}
```

Allowed roles: `super_admin`, `admin`, `operator`.

**Response:** `200`

```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "refreshToken": "<refresh>",
    "user": {
      "id": "uuid",
      "name": "Store Admin",
      "email": "admin@rofaar.com",
      "role": "admin"
    }
  }
}
```

### Get profile

```http
GET /auth/me
Authorization: Bearer <token>
```

**Response:** `200`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Store Admin",
    "email": "admin@rofaar.com",
    "role": "admin",
    "isVerified": true,
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### Change password

```http
POST /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "oldPassword": "current_password",
  "newPassword": "new_password_8chars_min"
}
```

**Response:** `200` — `{ "success": true, "message": "Password changed" }`

### Update profile

```http
PATCH /auth/profile
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Updated Name",
  "email": "new@email.com"
}
```

Both fields optional. **Response:** `200`

### Token refresh & logout

```http
POST /auth/refresh
Content-Type: application/json
```

**Body:** `{ "refreshToken": "<refresh>" }`
**Response:** `{ "success": true, "data": { "token": "<new_jwt>", "refreshToken": "<new_refresh>" } }`

```http
POST /auth/logout
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:** `{ "refreshToken": "<refresh>" }`
**Response:** `200`

---

## 3. Dashboard & analytics

Prefix: `/admin`.

**Guard:** `authenticate` + `adminOnly` on all routes below.

### Summary stats

```http
GET /admin/stats
```

**Response:** `200`

```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalOrders": 320,
    "totalProducts": 85,
    "totalRevenue": "125000.00"
  }
}
```

### Recent orders

```http
GET /admin/recent-orders
```

**Response:** `200` — Array of latest 10 orders with customer names and total amounts.

### Sales chart

```http
GET /admin/sales-chart?period=daily&startDate=2026-01-01T00:00:00Z&endDate=2026-05-01T00:00:00Z
```

| Query | Values |
|-------|--------|
| `period` | `daily`, `weekly`, `monthly` (default `daily`) |
| `startDate`, `endDate` | Optional ISO datetimes |

**Response:** `200`

```json
{
  "success": true,
  "data": [
    { "date": "2026-05-20", "revenue": "1500.00", "orders": 5 }
  ]
}
```

### Top selling products

```http
GET /admin/top-products?limit=10
```

| Query | Values |
|-------|--------|
| `limit` | Max results (1-50, default 10) |

**Response:** `200`

```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Product Name", "quantitySold": 50, "revenue": "45000.00" }
  ]
}
```

---

## 4. Products

Prefix: `/admin/products`.

**Guard:** `authenticate` + `requirePermission(action, "products")`.

### List Products

```http
GET /admin/products?page=1&limit=10&search=shirt&categoryId=<uuid>&sort=newest&isActive=true
```

**Query params:**
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Default 1 |
| `limit` | number | Default 10, max 100 |
| `search` | string | Optional keyword search |
| `category` | uuid | Optional filter by category |
| `brand` | uuid | Optional filter by brand |
| `minPrice` | number | Optional min price |
| `maxPrice` | number | Optional max price |
| `isActive` | string | `"true"` or `"false"` |
| `sort` | string | `newest`, `price-low`, `price-high`, `popular` (default `newest`) |

**Response:** `200` — Paginated product list.

### Create Product

```http
POST /admin/products
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Fields:**
| Field | Type | Required |
|-------|------|----------|
| `name` | string | Yes |
| `slug` | string | Yes |
| `description` | string | Yes (min 4) |
| `price` | number | Yes (positive) |
| `costPrice` | number | Yes (positive) |
| `discountPercentage` | number | 0-100, default 0 |
| `stock` | number | Yes (≥0) |
| `isActive` | boolean | Default true |
| `categoryId` | uuid | Yes |
| `brandId` | uuid | Yes |
| `files` | file(s) | Image uploads (jpeg/png/webp, max 5MB each) |

**Response:** `201` — Created product object.

### Update Product

```http
PUT /admin/products/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Same fields as Create, all optional. `images` field (JSON string) for existing image metadata. `files` for new uploads.

### Delete Product

```http
DELETE /admin/products/:id
Authorization: Bearer <token>
```

**Response:** `200` — `{ "success": true, "message": "Product deleted" }`

---

## 5. Categories & brands

### Categories

Prefix: `/admin/categories`.

**Guard:** `authenticate` + `requirePermission(action, "categories")`.

#### List Categories

```http
GET /admin/categories?page=1&limit=10&search=clothing&isActive=true
```

#### Create Category

```http
POST /admin/categories
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Field | Type | Required |
|-------|------|----------|
| `name` | string | Yes |
| `slug` | string | Yes |
| `description` | string | No |
| `imageFile` | file | Image (jpeg/png/webp, max 2MB) |

#### Update Category

```http
PUT /admin/categories/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Same fields as Create, all optional.

#### Delete Category

```http
DELETE /admin/categories/:id
Authorization: Bearer <token>
```

---

### Brands

Prefix: `/admin/brands`.

**Guard:** `authenticate` + `requirePermission(action, "brands")`.

#### List Brands

```http
GET /admin/brands?page=1&limit=10&search=nike&isActive=true
```

#### Create Brand

```http
POST /admin/brands
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Field | Type | Required |
|-------|------|----------|
| `name` | string | Yes |
| `slug` | string | Yes |
| `description` | string | No |
| `imageFile` | file | Logo (jpeg/png/webp, max 2MB) |

#### Update Brand

```http
PUT /admin/brands/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Same fields as Create, all optional.

#### Delete Brand

```http
DELETE /admin/brands/:id
Authorization: Bearer <token>
```

---

## 6. Marketing (banners & ads)

### Banners

Prefix: `/admin/banners`.

**Guard:** `authenticate` + `requirePermission(action, "banners")`.

#### List Banners

```http
GET /admin/banners
Authorization: Bearer <token>
```

Returns all banners including inactive ones.

#### Create Banner

```http
POST /admin/banners
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Field | Type | Required |
|-------|------|----------|
| `title` | string | No |
| `subtitle` | string | No |
| `imageUrl` | string (URL) | Yes |
| `linkUrl` | string (URL) | No |
| `isActive` | boolean | Default true |
| `sortOrder` | number | Default 0 |
| `imageFile` | file | Image (jpeg/png/webp, max 5MB) |

#### Update Banner

```http
PUT /admin/banners/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Same fields as Create, all optional.

#### Delete Banner

```http
DELETE /admin/banners/:id
Authorization: Bearer <token>
```

---

### Advertisements

Prefix: `/admin/advertisements`.

**Guard:** `authenticate` + `requirePermission(action, "advertisements")`.

#### List Advertisements

```http
GET /admin/advertisements/all
Authorization: Bearer <token>
```

Returns all ads including inactive ones.

#### Create Advertisement

```http
POST /admin/advertisements
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

| Field | Type | Required |
|-------|------|----------|
| `title` | string | No |
| `imageUrl` | string (URL) | Yes |
| `linkUrl` | string (URL) | No |
| `position` | string | Yes |
| `isActive` | boolean | Default true |
| `imageFile` | file | Image (jpeg/png/webp, max 5MB) |

#### Update Advertisement

```http
PUT /admin/advertisements/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

#### Delete Advertisement

```http
DELETE /admin/advertisements/:id
Authorization: Bearer <token>
```

---

## 7. Inventory

Prefix: `/admin/inventory`.

**Guard:** `authenticate` + `adminOnly`.

### Adjust stock

```http
POST /admin/inventory/adjust
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "productId": "uuid",
  "quantityChange": 10,
  "type": "stock_increase",
  "note": "Restock from supplier"
}
```

| `type` | Use case |
|--------|----------|
| `stock_increase` | Manual add |
| `stock_decrease` | Manual remove |
| `manual_adjustment` | Correction |

**Response:** `200`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "productId": "uuid",
    "type": "stock_increase",
    "quantityChange": 10,
    "stockAfter": 60,
    "note": "Restock from supplier",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

### Inventory logs

```http
GET /admin/inventory/logs?productId=<uuid>
Authorization: Bearer <token>
```

Optional `productId` to filter by product.

**Response:** `200`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "productId": "uuid",
      "type": "order_deduction",
      "quantityChange": -2,
      "stockAfter": 58,
      "note": "Order #123",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### Low stock alert

```http
GET /admin/inventory/low-stock
Authorization: Bearer <token>
```

**Response:** `200`
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Cotton T-Shirt", "stock": 5 }
  ]
}
```

---

## 8. Shipping

Prefix: `/admin/shipping`.

**Guard:** `authenticate` + `requirePermission(action, "shipping")`.

### Zones

#### Create Zone

```http
POST /admin/shipping/zones
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Dhaka",
  "description": "Inside Dhaka city"
}
```

**Response:** `201`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Dhaka",
    "description": "Inside Dhaka city",
    "isActive": true
  }
}
```

#### Update Zone

```http
PUT /admin/shipping/zones/:id
Authorization: Bearer <token>
Content-Type: application/json
```

Same body as Create, all optional.

#### Delete Zone

```http
DELETE /admin/shipping/zones/:id
Authorization: Bearer <token>
```

### Methods

#### Create Method

```http
POST /admin/shipping/methods
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "zoneId": "uuid",
  "name": "Standard Delivery",
  "cost": 80,
  "estimatedDays": "2-3 days"
}
```

**Response:** `201`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "zoneId": "uuid",
    "name": "Standard Delivery",
    "cost": "80.00",
    "estimatedDays": "2-3 days",
    "isActive": true
  }
}
```

#### Update Method

```http
PUT /admin/shipping/methods/:id
Authorization: Bearer <token>
Content-Type: application/json
```

Same body as Create, all optional. Also supports `isActive` boolean.

#### Delete Method

```http
DELETE /admin/shipping/methods/:id
Authorization: Bearer <token>
```

---

## 9. Coupons

Prefix: `/admin/coupons`.

**Guard:** `authenticate` + `requirePermission(action, "coupons")`.

### List Coupons

```http
GET /admin/coupons
Authorization: Bearer <token>
```

### Create Coupon

```http
POST /admin/coupons
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "code": "RAMADAN10",
  "description": "10% off Ramadan sale",
  "discountType": "percentage",
  "discountValue": 10,
  "minOrderAmount": 1000,
  "maxUsageCount": 500,
  "isActive": true,
  "expiresAt": "2026-04-30T23:59:59Z"
}
```

| `discountType` | `discountValue` meaning |
|----------------|-------------------------|
| `percentage` | Percent off subtotal |
| `fixed` | Fixed amount off subtotal |

**Response:** `201`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "RAMADAN10",
    "discountType": "percentage",
    "discountValue": "10.00",
    "minOrderAmount": "1000.00",
    "usageCount": 0,
    "isActive": true,
    "expiresAt": "2026-04-30T23:59:59.000Z"
  }
}
```

### Update Coupon

```http
PUT /admin/coupons/:id
Authorization: Bearer <token>
Content-Type: application/json
```

Same body as Create, all optional.

### Delete Coupon

```http
DELETE /admin/coupons/:id
Authorization: Bearer <token>
```

---

## 10. Orders (fulfillment)

Prefix: `/admin/orders`.

**Guard:** `authenticate` + per-route `requirePermission`.

### List orders

```http
GET /admin/orders?page=1&limit=20&status=pending&userId=<uuid>
Authorization: Bearer <token>
```

**Permission:** `read` `orders`

| Query | Type | Description |
|-------|------|-------------|
| `page` | number | Default 1 |
| `limit` | number | Default 10, max 100 |
| `status` | string | Filter by status |
| `userId` | uuid | Filter by customer |

**Response:** `200`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "pending",
      "total": "1500.00",
      "user": { "name": "Roky Ahmed" },
      "createdAt": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

### Orders by user

```http
GET /admin/orders/user/:id
Authorization: Bearer <token>
```

**Permission:** `read` `orders`

`:id` = customer UUID. **Response:** `200` — Array of orders.

### Order detail

```http
GET /admin/orders/:id
Authorization: Bearer <token>
```

**Permission:** `read` `orders`

Includes user, items with products, address, coupon.

**Response:** `200`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "pending",
    "total": "1500.00",
    "items": [
      { "productId": "uuid", "quantity": 2, "totalPrice": "1500.00", "product": { "name": "..." } }
    ],
    "address": { "recipientName": "...", "phone": "...", "address": "..." },
    "coupon": { "code": "..." },
    "user": { "name": "...", "email": "..." }
  }
}
```

### Update status (generic)

```http
PATCH /admin/orders/:id/status
Authorization: Bearer <token>
Content-Type: application/json
```

**Permission:** `update` `orders`

**Body:**
```json
{
  "status": "processing"
}
```

Allowed: `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned`.

**Response:** `200` — Updated order object.

### Lifecycle shortcuts

Prefer these for the standard flow — they enforce valid transitions and write order history.

| Step | Method | Path | Body |
|------|--------|------|------|
| 1. Confirm | `PATCH` | `/admin/orders/:id/confirm` | — |
| 2. Process | `PATCH` | `/admin/orders/:id/process` | — |
| 3. Ship | `PATCH` | `/admin/orders/:id/ship` | `{ "trackingNumber": "...", "trackingUrl": "..." }` |
| 4. Deliver | `PATCH` | `/admin/orders/:id/deliver` | — |
| Mark paid | `PATCH` | `/admin/orders/:id/mark-paid` | — |
| Return | `PATCH` | `/admin/orders/:id/return` | — |
| Cancel | `PATCH` | `/admin/orders/:id/cancel` | `{ "reason": "...", "comment": "..." }` |

**Note on Ship:** If `trackingNumber` is not provided and Steadfast Courier is configured, the system auto-creates a consignment on Steadfast and stores the tracking info.

**Response (All shortcuts):** `200` — Updated order object.

### Payment status

```http
PATCH /admin/orders/:id/payment-status
Authorization: Bearer <token>
Content-Type: application/json
```

**Permission:** `update` `orders`

**Body:**
```json
{
  "paymentStatus": "paid"
}
```

Values: `unpaid`, `paid`, `partial`, `failed`, `refunded`.

**Response:** `200` — Updated order object.

### Cancel request actions

```http
PATCH /admin/orders/:id/cancel-request/approve
PATCH /admin/orders/:id/cancel-request/reject
Authorization: Bearer <token>
Content-Type: application/json
```

**Permission:** `update` `orders`

**Body:**
```json
{
  "reason": "Customer requested",
  "comment": "Will process refund"
}
```

**Response (approve):** `200` — Order status set to `cancelled`.
**Response (reject):** `200` — Cancel request rejected, status unchanged. A history entry is logged.

### Delete order

```http
DELETE /admin/orders/:id
Authorization: Bearer <token>
```

**Permission:** `delete` `orders`

Restocks inventory and decrements coupon usage. **Response:** `200`

### Order fulfillment flow

```
pending → confirmed → processing → shipped → delivered
  ↓          ↓
cancelled  cancelled
                       delivered → returned
```

---

## 11. Refunds

Prefix: `/admin/refunds`.

**Guard:** `authenticate` + `requirePermission(action, "orders")`.

### List refund requests

```http
GET /admin/refunds
Authorization: Bearer <token>
```

**Permission:** `read` `orders`

**Response:** `200`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "orderId": "uuid",
      "status": "requested",
      "reason": "Damaged product",
      "user": { "name": "Roky Ahmed" }
    }
  ]
}
```

### Approve refund

```http
PATCH /admin/refunds/:id/approve
Authorization: Bearer <token>
Content-Type: application/json
```

**Permission:** `update` `orders`

**Body:**
```json
{
  "adminNote": "Refund approved, amount sent"
}
```

Sets order status to `returned` and payment status to `refunded`.

**Response:** `200`
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "approved", "adminNote": "..." }
}
```

### Reject refund

```http
PATCH /admin/refunds/:id/reject
Authorization: Bearer <token>
Content-Type: application/json
```

**Permission:** `update` `orders`

**Body:**
```json
{
  "adminNote": "Item shows normal wear — not eligible"
}
```

`adminNote` required (min 5 characters).

**Response:** `200`
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "rejected", "adminNote": "..." }
}
```

---

## 12. Users

Prefix: `/admin/users`.

**Guard:** `authenticate` + `adminOnly`.

### List Users

```http
GET /admin/users
Authorization: Bearer <token>
```

**Response:** `200`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Roky Ahmed",
      "phone": "01712345678",
      "email": "roky@example.com",
      "role": "customer",
      "isActive": true,
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### Get User by ID

```http
GET /admin/users/:id
Authorization: Bearer <token>
```

**Response:** `200` — Full user object.

### Update User

```http
PUT /admin/users/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:** (all optional)
```json
{
  "name": "Updated Name",
  "email": "new@email.com",
  "avatar": "https://example.com/avatar.jpg",
  "roleId": "uuid",
  "isActive": false,
  "isVerified": true
}
```

**Response:** `200` — Updated user object.

### Delete User

```http
DELETE /admin/users/:id
Authorization: Bearer <token>
```

**Response:** `200` — `{ "success": true, "message": "User deleted" }`

---

## 13. Roles & permissions (RBAC)

Prefix: `/admin/rbac`.

**Guard:** `authenticate` + `adminOnly`.

### List Roles

```http
GET /admin/rbac/roles
Authorization: Bearer <token>
```

**Response:** `200`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "admin",
      "description": "Administrator with full access",
      "permissions": [
        { "id": "uuid", "action": "create", "resource": "products" }
      ]
    }
  ]
}
```

### Get Role

```http
GET /admin/rbac/roles/:id
Authorization: Bearer <token>
```

### Create Role

```http
POST /admin/rbac/roles
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "moderator",
  "description": "Can manage reviews and contacts"
}
```

`name`: lowercase with underscores, 1-100 chars. **Response:** `201`

### Update Role

```http
PUT /admin/rbac/roles/:id
Authorization: Bearer <token>
Content-Type: application/json
```

Same body as Create, all optional.

### Delete Role

```http
DELETE /admin/rbac/roles/:id
Authorization: Bearer <token>
```

Protected roles (`super_admin`, `admin`, `customer`) cannot be deleted.

### List Permissions

```http
GET /admin/rbac/permissions
Authorization: Bearer <token>
```

### Create Permission

```http
POST /admin/rbac/permissions
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "action": "export",
  "resource": "orders",
  "description": "Can export order data"
}
```

### Delete Permission

```http
DELETE /admin/rbac/permissions/:id
Authorization: Bearer <token>
```

### Assign Permissions to Role (replace all)

```http
PUT /admin/rbac/roles/:id/permissions
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "permissionIds": ["uuid1", "uuid2", "uuid3"]
}
```

Replaces all existing permissions for the role. **Response:** `200`

### Remove Single Permission from Role

```http
DELETE /admin/rbac/roles/:roleId/permissions/:permissionId
Authorization: Bearer <token>
```

### Default permission matrix

| Role | Typical access |
|------|----------------|
| `super_admin` | Everything (`manage` + `*`) |
| `admin` | Full catalog, orders, coupons, users, contacts, reviews |
| `operator` | Read/update orders, read products/categories/reviews |
| `customer` | Storefront only (not admin routes) |

| Resource | Actions |
|----------|---------|
| `products` | create, read, update, delete |
| `categories` | create, read, update, delete |
| `brands` | create, read, update, delete |
| `banners` | create, read, update, delete |
| `advertisements` | create, read, update, delete |
| `orders` | read, update |
| `coupons` | create, read, update, delete |
| `reviews` | read, update, delete |
| `users` | read, update |
| `contacts` | read, update, delete |
| `shipping` | create, read, update, delete |

Routes using `adminOnly` (dashboard, inventory, shipping, Steadfast, users) require `admin` or `super_admin` role name — operators cannot access these unless promoted.

---

## 14. Reviews moderation

Prefix: `/admin/reviews`.

**Guard:** `authenticate` + `requirePermission(action, "reviews")`.

### List Reviews

```http
GET /admin/reviews
Authorization: Bearer <token>
```

**Response:** `200`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "Great product!",
      "product": { "name": "Product Name" },
      "user": { "name": "Customer Name" }
    }
  ]
}
```

### Delete Review

```http
DELETE /admin/reviews/:id
Authorization: Bearer <token>
```

---

## 15. Contact submissions

Prefix: `/admin/contact`.

**Guard:** `authenticate` + `requirePermission(action, "contacts")`.

### List Contacts

```http
GET /admin/contact
Authorization: Bearer <token>
```

**Response:** `200`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Roky",
      "subject": "Help",
      "message": "How do I return an item?",
      "status": "pending"
    }
  ]
}
```

### Update Contact Status

```http
PATCH /admin/contact/:id/status
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "status": "resolved"
}
```

Values: `pending`, `read`, `resolved`.

### Delete Contact

```http
DELETE /admin/contact/:id
Authorization: Bearer <token>
```

---

## 16. Product Q&A

Prefix: `/admin/qa`.

**Guard:** `authenticate` + `requirePermission("update", "products")`.

### Answer a Question

```http
POST /admin/qa/answer
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "questionId": "uuid",
  "answer": "Yes, size XL is in stock."
}
```

**Response:** `201`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "questionId": "uuid",
    "answer": "Yes, size XL is in stock.",
    "isOfficial": true
  }
}
```

---

## 17. Cart management

Prefix: `/admin/cart`.

Support tool to inspect or fix a customer's cart.

**Guard:** `authenticate` + `requirePermission(action, "orders")`.

### Get Customer Cart

```http
GET /admin/cart/user/:id
Authorization: Bearer <token>
```

**Permission:** `read` `orders`

`:id` = customer UUID. **Response:** `200` — Array of cart items.

### Clear Customer Cart

```http
DELETE /admin/cart/user/:id
Authorization: Bearer <token>
```

**Permission:** `update` `orders`

### Update Cart Item Quantity

```http
PUT /admin/cart/user/:userId/update/:id
Authorization: Bearer <token>
Content-Type: application/json
```

**Permission:** `update` `orders`

- `:userId` = customer UUID
- `:id` = cart line item UUID

**Body:**
```json
{
  "quantity": 2
}
```

**Response:** `200` — Updated cart item.

---

## 18. Steadfast Courier

Prefix: `/admin/steadfast`.

**Guard:** `authenticate` + `adminOnly`.

Requires Steadfast credentials configured in `.env`. The system auto-pushes orders to Steadfast when an admin marks an order as shipped without providing manual tracking.

### Send Order to Steadfast

```http
POST /admin/steadfast/orders/:id/send
Authorization: Bearer <token>
```

Creates a consignment on Steadfast for the given order.

**Response:** `200`
```json
{
  "success": true,
  "data": {
    "status": 200,
    "message": "Consignment has been created successfully.",
    "consignment": {
      "consignment_id": 255596661,
      "invoice": "demo-invoice",
      "tracking_code": "SFR260602ST9719B25BD",
      "tracking_link": "https://steadfast.com.bd/tl/xxx",
      "recipient_name": "Roky Hasan",
      "recipient_phone": "01712345678",
      "recipient_address": "House 12, Road 5, Gulshan, Dhaka",
      "cod_amount": 1500,
      "status": "in_review",
      "created_at": "2026-06-02T05:29:14.000000Z"
    }
  }
}
```

### Check Balance

```http
GET /admin/steadfast/balance
Authorization: Bearer <token>
```

**Response:** `200`
```json
{
  "success": true,
  "data": {
    "status": 200,
    "current_balance": 578
  }
}
```

### Get Tracking Status by Tracking Code

```http
GET /admin/steadfast/tracking/:trackingCode
Authorization: Bearer <token>
```

### Get Status by Invoice

```http
GET /admin/steadfast/status/invoice/:invoice
Authorization: Bearer <token>
```

### Get Status by Consignment ID

```http
GET /admin/steadfast/status/consignment/:id
Authorization: Bearer <token>
```

**Response (status endpoints):**
```json
{
  "success": true,
  "data": {
    "status": 200,
    "delivery_status": "in_review"
  }
}
```

Possible delivery statuses: `pending`, `in_review`, `hold`, `delivered_approval_pending`, `partial_delivered_approval_pending`, `cancelled_approval_pending`, `delivered`, `partial_delivered`, `cancelled`, `unknown`.

### Bulk Send Orders

```http
POST /admin/steadfast/bulk-send
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "orderIds": ["uuid1", "uuid2", "uuid3"]
}
```

Max 500 order IDs. **Response:** `200`
```json
{
  "success": true,
  "data": [
    { "orderId": "uuid1", "success": true },
    { "orderId": "uuid2", "success": false, "error": "No address" }
  ]
}
```

### Create Return Request

```http
POST /admin/steadfast/return-request
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:** (at least one identifier required)
```json
{
  "consignment_id": 255596661,
  "reason": "Customer returned the product"
}
```

Can also use `invoice` or `tracking_code` instead of `consignment_id`.

### List Return Requests

```http
GET /admin/steadfast/return-requests
Authorization: Bearer <token>
```

### Get Single Return Request

```http
GET /admin/steadfast/return-requests/:id
Authorization: Bearer <token>
```

### List Payments

```http
GET /admin/steadfast/payments
Authorization: Bearer <token>
```

### Get Single Payment

```http
GET /admin/steadfast/payments/:id
Authorization: Bearer <token>
```

### List Police Stations

```http
GET /admin/steadfast/police-stations
Authorization: Bearer <token>
```

---

## 19. Uploads

### Upload Image

```http
POST /uploads/image
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Permission:** `create` `products`

Single file upload to Cloudflare R2.

**Response:** `200`
```json
{
  "success": true,
  "data": {
    "url": "https://r2.rofaar.com/images/uuid-filename.webp"
  }
}
```

---

## 20. Operational playbook

### New order (COD)

1. `GET /admin/orders?status=pending` — review new orders
2. `PATCH /admin/orders/:id/confirm`
3. `PATCH /admin/orders/:id/process`
4. `PATCH /admin/orders/:id/ship` — auto-pushes to Steadfast if no tracking provided
5. `PATCH /admin/orders/:id/deliver`

### New order (on_air / bKash)

1. Steps 1–2 above
2. Wait for customer `POST /orders/:id/pay`
3. Verify transaction ID manually
4. `PATCH /admin/orders/:id/mark-paid`
5. Continue process → ship → deliver

### Low stock

1. `GET /admin/inventory/low-stock`
2. `POST /admin/inventory/adjust` — restock
3. Optionally update product via `PUT /admin/products/:id`

### Refund request

1. `GET /admin/refunds`
2. Review order via `GET /admin/orders/:id`
3. `PATCH /admin/refunds/:id/approve` or `reject`

### Daily dashboard check

1. `GET /admin/stats`
2. `GET /admin/recent-orders`
3. `GET /admin/sales-chart?period=daily`
4. `GET /admin/top-products?limit=5`

---

## 21. Quick reference

| # | Area | Method | Path |
|---|------|--------|------|
| 1 | Auth | POST | `/auth/admin/login` |
| 2 | Auth | GET | `/auth/me` |
| 3 | Auth | POST | `/auth/change-password` |
| 4 | Auth | PATCH | `/auth/profile` |
| 5 | Auth | POST | `/auth/refresh` |
| 6 | Auth | POST | `/auth/logout` |
| 7 | Dashboard | GET | `/admin/stats` |
| 8 | Dashboard | GET | `/admin/recent-orders` |
| 9 | Dashboard | GET | `/admin/sales-chart` |
| 10 | Dashboard | GET | `/admin/top-products` |
| 11 | Products | GET | `/admin/products` |
| 12 | Products | POST | `/admin/products` |
| 13 | Products | PUT | `/admin/products/:id` |
| 14 | Products | DELETE | `/admin/products/:id` |
| 15 | Categories | GET | `/admin/categories` |
| 16 | Categories | POST | `/admin/categories` |
| 17 | Categories | PUT | `/admin/categories/:id` |
| 18 | Categories | DELETE | `/admin/categories/:id` |
| 19 | Brands | GET | `/admin/brands` |
| 20 | Brands | POST | `/admin/brands` |
| 21 | Brands | PUT | `/admin/brands/:id` |
| 22 | Brands | DELETE | `/admin/brands/:id` |
| 23 | Banners | GET | `/admin/banners` |
| 24 | Banners | POST | `/admin/banners` |
| 25 | Banners | PUT | `/admin/banners/:id` |
| 26 | Banners | DELETE | `/admin/banners/:id` |
| 27 | Ads | GET | `/admin/advertisements/all` |
| 28 | Ads | POST | `/admin/advertisements` |
| 29 | Ads | PUT | `/admin/advertisements/:id` |
| 30 | Ads | DELETE | `/admin/advertisements/:id` |
| 31 | Inventory | POST | `/admin/inventory/adjust` |
| 32 | Inventory | GET | `/admin/inventory/logs` |
| 33 | Inventory | GET | `/admin/inventory/low-stock` |
| 34 | Shipping | POST | `/admin/shipping/zones` |
| 35 | Shipping | PUT | `/admin/shipping/zones/:id` |
| 36 | Shipping | DELETE | `/admin/shipping/zones/:id` |
| 37 | Shipping | POST | `/admin/shipping/methods` |
| 38 | Shipping | PUT | `/admin/shipping/methods/:id` |
| 39 | Shipping | DELETE | `/admin/shipping/methods/:id` |
| 40 | Coupons | GET | `/admin/coupons` |
| 41 | Coupons | POST | `/admin/coupons` |
| 42 | Coupons | PUT | `/admin/coupons/:id` |
| 43 | Coupons | DELETE | `/admin/coupons/:id` |
| 44 | Orders | GET | `/admin/orders` |
| 45 | Orders | GET | `/admin/orders/user/:id` |
| 46 | Orders | GET | `/admin/orders/:id` |
| 47 | Orders | PATCH | `/admin/orders/:id/status` |
| 48 | Orders | PATCH | `/admin/orders/:id/payment-status` |
| 49 | Orders | PATCH | `/admin/orders/:id/confirm` |
| 50 | Orders | PATCH | `/admin/orders/:id/process` |
| 51 | Orders | PATCH | `/admin/orders/:id/ship` |
| 52 | Orders | PATCH | `/admin/orders/:id/deliver` |
| 53 | Orders | PATCH | `/admin/orders/:id/mark-paid` |
| 54 | Orders | PATCH | `/admin/orders/:id/return` |
| 55 | Orders | PATCH | `/admin/orders/:id/cancel` |
| 56 | Orders | PATCH | `/admin/orders/:id/cancel-request/approve` |
| 57 | Orders | PATCH | `/admin/orders/:id/cancel-request/reject` |
| 58 | Orders | DELETE | `/admin/orders/:id` |
| 59 | Refunds | GET | `/admin/refunds` |
| 60 | Refunds | PATCH | `/admin/refunds/:id/approve` |
| 61 | Refunds | PATCH | `/admin/refunds/:id/reject` |
| 62 | Users | GET | `/admin/users` |
| 63 | Users | GET | `/admin/users/:id` |
| 64 | Users | PUT | `/admin/users/:id` |
| 65 | Users | DELETE | `/admin/users/:id` |
| 66 | RBAC | GET | `/admin/rbac/roles` |
| 67 | RBAC | GET | `/admin/rbac/roles/:id` |
| 68 | RBAC | POST | `/admin/rbac/roles` |
| 69 | RBAC | PUT | `/admin/rbac/roles/:id` |
| 70 | RBAC | DELETE | `/admin/rbac/roles/:id` |
| 71 | RBAC | GET | `/admin/rbac/permissions` |
| 72 | RBAC | POST | `/admin/rbac/permissions` |
| 73 | RBAC | DELETE | `/admin/rbac/permissions/:id` |
| 74 | RBAC | PUT | `/admin/rbac/roles/:id/permissions` |
| 75 | RBAC | DELETE | `/admin/rbac/roles/:roleId/permissions/:permissionId` |
| 76 | Reviews | GET | `/admin/reviews` |
| 77 | Reviews | DELETE | `/admin/reviews/:id` |
| 78 | Contacts | GET | `/admin/contact` |
| 79 | Contacts | PATCH | `/admin/contact/:id/status` |
| 80 | Contacts | DELETE | `/admin/contact/:id` |
| 81 | Q&A | POST | `/admin/qa/answer` |
| 82 | Cart | GET | `/admin/cart/user/:id` |
| 83 | Cart | DELETE | `/admin/cart/user/:id` |
| 84 | Cart | PUT | `/admin/cart/user/:userId/update/:id` |
| 85 | Steadfast | POST | `/admin/steadfast/orders/:id/send` |
| 86 | Steadfast | GET | `/admin/steadfast/balance` |
| 87 | Steadfast | GET | `/admin/steadfast/tracking/:trackingCode` |
| 88 | Steadfast | GET | `/admin/steadfast/status/invoice/:invoice` |
| 89 | Steadfast | GET | `/admin/steadfast/status/consignment/:id` |
| 90 | Steadfast | POST | `/admin/steadfast/bulk-send` |
| 91 | Steadfast | POST | `/admin/steadfast/return-request` |
| 92 | Steadfast | GET | `/admin/steadfast/return-requests` |
| 93 | Steadfast | GET | `/admin/steadfast/return-requests/:id` |
| 94 | Steadfast | GET | `/admin/steadfast/payments` |
| 95 | Steadfast | GET | `/admin/steadfast/payments/:id` |
| 96 | Steadfast | GET | `/admin/steadfast/police-stations` |
| 97 | Uploads | POST | `/uploads/image` |

---

*Last updated to match the current `rofaar-backend` route implementation.*

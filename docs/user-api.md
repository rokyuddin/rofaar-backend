# Rofaar User (Customer) API Guide

Base URL: `http://localhost:3000/api/v1` (development)  
Base URL: `https://api.rofaar.com/api/v1` (production)

Content-Type: `application/json` (unless noted as multipart)

---

## Standard Response Envelope

**Success (single resource) — HTTP 200/201:**
```json
{ "success": true, "data": { ... }, "message": "optional" }
```

**Success (list) — HTTP 200:**
```json
{ "success": true, "data": [ ... ], "pagination": { "page": 1, "limit": 10, "total": 100, "totalPages": 10 } }
```

**Error — HTTP 4xx/5xx:**
```json
{ "success": false, "code": "ERROR_CODE", "message": "Human-readable error" }
```

---

## 1. Authentication

Prefix: `/auth`.

### 1.1 Register — Send OTP

```http
POST /auth/register/send-otp
Content-Type: application/json

{ "phone": "01912345678" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | 11 digits, starts with `01` |

**Response:** `200 OK`

```json
{ "success": true, "message": "OTP sent successfully" }
```

---

### 1.2 Register — Verify OTP

```http
POST /auth/register/verify-otp
Content-Type: application/json

{ "phone": "01912345678", "otp": "123456" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | 11 digits |
| `otp` | string | Yes | 6-digit OTP |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": { "token": "registration-token-string" }
}
```

---

### 1.3 Register — Complete

```http
POST /auth/register/complete
Content-Type: application/json

{
  "token": "registration-token-string",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | Token from verify-otp |
| `name` | string | Yes | 2–120 chars |
| `email` | string | Yes | Valid email |
| `password` | string | Yes | Min 8 chars |

**Response:** `201 Created`

```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "token": "jwt-access-token",
    "refreshToken": "refresh-token-string",
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "customer"
    }
  }
}
```

---

### 1.4 Login

```http
POST /auth/login
Content-Type: application/json

{ "phone": "01912345678", "password": "password123" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | string | Yes | Registered phone number |
| `password` | string | Yes | Password |

**Response:** `200 OK` — Same shape as register complete (token, refreshToken, user).

---

### 1.5 Get My Profile

```http
GET /auth/me
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "customer",
    "isVerified": true,
    "createdAt": "2026-06-02T10:00:00.000Z"
  }
}
```

---

### 1.6 Update Profile

```http
PATCH /auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "John Updated", "email": "john.new@example.com" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | 2–120 chars |
| `email` | string | No | Valid email |

**Response:** `200 OK`

```json
{ "success": true, "message": "Profile updated" }
```

---

### 1.7 Change Password

```http
POST /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{ "oldPassword": "currentpass", "newPassword": "newpass123" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `oldPassword` | string | Yes | Current password |
| `newPassword` | string | Yes | Min 8 chars |

**Response:** `200 OK`

```json
{ "success": true, "message": "Password changed successfully" }
```

---

### 1.8 Forgot Password — Send OTP

```http
POST /auth/forgot-password
Content-Type: application/json

{ "phone": "01912345678" }
```

**Response:** `200 OK`

---

### 1.9 Forgot Password — Verify OTP

```http
POST /auth/forgot-password/verify-otp
Content-Type: application/json

{ "phone": "01912345678", "otp": "123456" }
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": { "resetToken": "reset-token-string" }
}
```

---

### 1.10 Forgot Password — Reset

```http
POST /auth/forgot-password/reset
Content-Type: application/json

{ "resetToken": "reset-token-string", "newPassword": "newpass123" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `resetToken` | string | Yes | Token from verify-otp |
| `newPassword` | string | Yes | Min 8 chars |

**Response:** `200 OK`

---

### 1.11 Refresh Token

```http
POST /auth/refresh
Content-Type: application/json

{ "refreshToken": "refresh-token-string" }
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "token": "new-jwt-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

---

### 1.12 Logout

```http
POST /auth/logout
Authorization: Bearer <token>
Content-Type: application/json

{ "refreshToken": "refresh-token-string" }
```

**Response:** `200 OK`

---

## 2. Products

Prefix: `/products`. Public unless noted.

### 2.1 List Products

```http
GET /products?page=1&limit=10&search=shirt&category=<uuid>&sort=newest
```

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 10 | Items per page (max 100) |
| `search` | string | — | Search by name |
| `category` | uuid | — | Filter by category |
| `brand` | uuid | — | Filter by brand |
| `minPrice` | number | — | Minimum price |
| `maxPrice` | number | — | Maximum price |
| `sort` | enum | `newest` | `newest`, `price-low`, `price-high`, `popular` |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Wireless Earbuds",
      "slug": "wireless-earbuds",
      "description": "High quality wireless earbuds",
      "price": "2499.00",
      "costPrice": "1500.00",
      "discountPercentage": 10,
      "finalPrice": 2249.1,
      "stock": 50,
      "isActive": true,
      "category": { "id": "uuid", "name": "Electronics" },
      "brand": { "id": "uuid", "name": "Samsung" },
      "images": [
        { "url": "https://...", "sortOrder": 0 },
        { "url": "https://...", "sortOrder": 1 }
      ]
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 50, "totalPages": 5 }
}
```

---

### 2.2 Get Product by Slug

```http
GET /products/:slug
```

**Response:** `200 OK` — Single product object (same shape as list item above).

---

### 2.3 Get Related Products

```http
GET /products/:id/related
```

| Param | Type | Description |
|-------|------|-------------|
| `id` | uuid | Product UUID |

**Response:** `200 OK` — Array of product objects.

---

### 2.4 Recently Viewed Products

```http
GET /products/recently-viewed
Authorization: Bearer <token>
```

**Response:** `200 OK` — Array of product objects.

---

## 3. Categories

Prefix: `/categories`. Public.

### 3.1 List Categories

```http
GET /categories?page=1&limit=10&search=electronic
```

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 10 | Items per page (max 100) |
| `search` | string | — | Search by name |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "slug": "electronics",
      "description": "Electronic gadgets and accessories",
      "imageUrl": "https://...",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 15, "totalPages": 2 }
}
```

---

### 3.2 Get Category by Slug

```http
GET /categories/:slug
```

**Response:** `200 OK` — Single category object.

---

## 4. Brands

Prefix: `/brands`. Public.

### 4.1 List Brands

```http
GET /brands?page=1&limit=10&search=samsung
```

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 10 | Items per page (max 100) |
| `search` | string | — | Search by name |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Samsung",
      "slug": "samsung",
      "description": "Samsung electronics",
      "logoUrl": "https://...",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 8, "totalPages": 1 }
}
```

---

### 4.2 Get Brand by Slug

```http
GET /brands/:slug
```

**Response:** `200 OK` — Single brand object.

---

## 5. Cart

Prefix: `/cart`. All require `Authorization: Bearer <token>`.

### 5.1 List Cart Items

```http
GET /cart
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "productId": "uuid",
      "quantity": 2,
      "price": "2499.00",
      "createdAt": "2026-06-02T10:00:00.000Z",
      "updatedAt": "2026-06-02T10:00:00.000Z",
      "product": {
        "id": "uuid",
        "name": "Wireless Earbuds",
        "slug": "wireless-earbuds",
        "description": "...",
        "price": "2499.00",
        "costPrice": "1500.00",
        "discountPercentage": 10,
        "stock": 50,
        "lowStockThreshold": 10,
        "isActive": true,
        "categoryId": "uuid",
        "brandId": "uuid",
        "createdAt": "...",
        "updatedAt": "...",
        "images": [
          { "id": "uuid", "productId": "uuid", "url": "https://...", "sortOrder": 0 },
          { "id": "uuid", "productId": "uuid", "url": "https://...", "sortOrder": 1 }
        ]
      }
    }
  ]
}
```

---

### 5.2 Add Item to Cart

```http
POST /cart
Authorization: Bearer <token>
Content-Type: application/json

{ "productId": "uuid", "quantity": 1 }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `productId` | uuid | Yes | Product UUID |
| `quantity` | int | Yes | ≥ 1 |

**Response:** `201 Created` — Single cart item object.

---

### 5.3 Update Cart Item Quantity

```http
PUT /cart/:id
Authorization: Bearer <token>
Content-Type: application/json

{ "quantity": 3 }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `quantity` | int | Yes | ≥ 1 |

**Response:** `200 OK` — Updated cart item object.

---

### 5.4 Remove Cart Item

```http
DELETE /cart/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{ "success": true, "data": null, "message": "Item removed from cart" }
```

---

### 5.5 Clear Cart

```http
DELETE /cart
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{ "success": true, "data": null, "message": "Cart cleared" }
```

---

## 6. Addresses

Prefix: `/addresses`. All require `Authorization: Bearer <token>`.

### 6.1 List Addresses

```http
GET /addresses
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "label": "Home",
      "recipientName": "John Doe",
      "phone": "01912345678",
      "altPhone": "01987654321",
      "address": "123 Main Street",
      "city": "Dhaka",
      "area": "Gulshan",
      "zone": "Gulshan-1",
      "isDefault": true
    }
  ]
}
```

---

### 6.2 Create Address

```http
POST /addresses
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipientName": "John Doe",
  "phone": "01912345678",
  "address": "123 Main Street",
  "city": "Dhaka",
  "area": "Gulshan"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `label` | string | No | `"Home"` | Max 50 chars |
| `recipientName` | string | Yes | — | Max 255 chars |
| `phone` | string | Yes | — | Exactly 11 digits, starts with `01` |
| `altPhone` | string | No | — | Exactly 11 digits, starts with `01` |
| `address` | string | Yes | — | Max 500 chars |
| `city` | string | Yes | — | Max 100 chars |
| `area` | string | Yes | — | Max 100 chars |
| `zone` | string | No | — | Max 100 chars |
| `isDefault` | boolean | No | `false` | — |

**Response:** `201 Created` — Address object.

---

### 6.3 Update Address

```http
PUT /addresses/:id
Authorization: Bearer <token>
Content-Type: application/json

{ "phone": "01987654321", "isDefault": true }
```

Same fields as create (all optional). **Response:** `200 OK` — Updated address object.

---

### 6.4 Delete Address

```http
DELETE /addresses/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{ "success": true, "data": null, "message": "Address deleted" }
```

---

## 7. Orders

Prefix: `/orders`. All require `Authorization: Bearer <token>`.

### 7.1 Place Order

```http
POST /orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "addressId": "uuid",
  "paymentMethod": "cod",
  "shippingMethodId": "uuid",
  "couponCode": "SAVE10"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `addressId` | uuid | Yes | Shipping address UUID |
| `paymentMethod` | enum | Yes | `cod` or `on_air` |
| `shippingMethodId` | uuid | Yes | Shipping method UUID |
| `couponCode` | string | No | Coupon code (auto-uppercased) |

**Response:** `201 Created`

```json
{ "success": true, "data": { "orderId": "uuid" }, "message": "Order placed successfully" }
```

---

### 7.2 List My Orders

```http
GET /orders
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "status": "pending",
      "paymentStatus": "unpaid",
      "paymentMethod": "cod",
      "subtotal": "2499.00",
      "discountAmount": "0.00",
      "total": "2749.00",
      "shippingFee": "250.00",
      "trackingNumber": null,
      "createdAt": "2026-06-02T10:00:00.000Z",
      "updatedAt": "2026-06-02T10:00:00.000Z",
      "items": [
        {
          "id": "uuid",
          "productId": "uuid",
          "quantity": 1,
          "unitPrice": "2499.00",
          "totalPrice": "2499.00",
          "product": {
            "id": "uuid",
            "name": "Wireless Earbuds",
            "slug": "wireless-earbuds",
            "price": "2499.00",
            "costPrice": "1500.00",
            "discountPercentage": 10,
            "stock": 50,
            "isActive": true,
            "createdAt": "...",
            "updatedAt": "..."
          }
        }
      ],
      "address": {
        "id": "uuid",
        "recipientName": "John Doe",
        "phone": "01912345678",
        "address": "123 Main Street",
        "city": "Dhaka",
        "area": "Gulshan"
      }
    }
  ]
}
```

---

### 7.3 Get Order Detail

```http
GET /orders/:id
Authorization: Bearer <token>
```

**Response:** `200 OK` — Order object (same as list) plus `coupon` field:

```json
{
  "id": "uuid",
  "...": "...",
  "coupon": {
    "id": "uuid",
    "code": "SAVE10",
    "discountType": "percentage",
    "discountValue": "10.00",
    "minOrderAmount": "500.00",
    "isActive": true,
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "createdAt": "..."
  }
}
```

---

### 7.4 Track Order

```http
GET /orders/:id/track
Authorization: Bearer <token>
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "status": "shipped",
      "trackingNumber": "SFR260602ST9719B25BD",
      "trackingUrl": "https://portal.packzy.com/track/SFR260602ST9719B25BD",
      "items": [ /* order items with product */ ],
      "address": { /* address object */ }
    },
    "history": [
      {
        "id": "uuid",
        "action": "placed",
        "previousStatus": null,
        "newStatus": "pending",
        "note": null,
        "createdAt": "2026-06-02T10:00:00.000Z",
        "performedBy": { "name": "John Doe" }
      },
      {
        "id": "uuid",
        "action": "confirmed",
        "previousStatus": "pending",
        "newStatus": "confirmed",
        "note": null,
        "createdAt": "2026-06-02T11:00:00.000Z",
        "performedBy": { "name": "Admin" }
      }
    ]
  }
}
```

Possible `action` values: `placed`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`, `returned`, `payment_pending`, `payment_verified`, `cancel_requested`.

---

### 7.5 Cancel Order

```http
PATCH /orders/:id/cancel
Authorization: Bearer <token>
```

**Response:** `200 OK` — Updated order object.

---

## 8. Wishlist

Prefix: `/wishlist`. All require `Authorization: Bearer <token>`.

### 8.1 List Wishlist

```http
GET /wishlist
Authorization: Bearer <token>
```

**Response:** `200 OK` — Array of wishlist items (with nested product).

---

### 8.2 Add to Wishlist

```http
POST /wishlist
Authorization: Bearer <token>
Content-Type: application/json

{ "productId": "uuid" }
```

**Response:** `201 Created` — Wishlist item object.

---

### 8.3 Remove from Wishlist

```http
DELETE /wishlist/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### 8.4 Move Item to Cart

```http
POST /wishlist/move/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### 8.5 Move All to Cart

```http
POST /wishlist/move
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

## 9. Reviews

Prefix: `/reviews`.

### 9.1 List Product Reviews (Public)

```http
GET /reviews/product/:id
```

| Param | Type | Description |
|-------|------|-------------|
| `id` | uuid | Product UUID |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "productId": "uuid",
      "rating": 5,
      "comment": "Great product!",
      "createdAt": "2026-06-02T10:00:00.000Z"
    }
  ]
}
```

---

### 9.2 Write Review (Authenticated)

```http
POST /reviews
Authorization: Bearer <token>
Content-Type: application/json

{ "productId": "uuid", "rating": 5, "comment": "Excellent quality" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `productId` | uuid | Yes | Product UUID |
| `rating` | int | Yes | 1–5 |
| `comment` | string | No | Review text |

**Response:** `201 Created` — Review object.

---

### 9.3 Update Review

```http
PUT /reviews/:id
Authorization: Bearer <token>
Content-Type: application/json

{ "rating": 4, "comment": "Updated review" }
```

**Response:** `200 OK` — Updated review object.

---

### 9.4 Delete Review

```http
DELETE /reviews/:id
Authorization: Bearer <token>
```

**Response:** `200 OK`

---

### 9.5 Mark Review as Helpful (Public)

```http
POST /reviews/:id/helpful
```

**Response:** `200 OK`

---

## 10. Q&A

Prefix: `/qa`.

### 10.1 List Product Questions (Public)

```http
GET /qa/product/:id
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "question": "Is this product waterproof?",
      "createdAt": "2026-06-02T10:00:00.000Z",
      "user": { "name": "John Doe" },
      "answers": [
        {
          "id": "uuid",
          "answer": "Yes, it is IPX7 rated",
          "isOfficial": true,
          "createdAt": "2026-06-02T11:00:00.000Z",
          "user": { "name": "Rofaar Admin" }
        }
      ]
    }
  ]
}
```

---

### 10.2 Ask a Question (Authenticated)

```http
POST /qa
Authorization: Bearer <token>
Content-Type: application/json

{ "productId": "uuid", "question": "Is this waterproof?" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `productId` | uuid | Yes | Product UUID |
| `question` | string | Yes | Min 5 chars |

**Response:** `201 Created` — Question object.

---

## 11. Refunds

Prefix: `/refunds`. All require `Authorization: Bearer <token>`.

### 11.1 Request Refund

```http
POST /refunds
Authorization: Bearer <token>
Content-Type: application/json

{ "orderId": "uuid", "reason": "Product arrived damaged and not working" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `orderId` | uuid | Yes | Order UUID |
| `reason` | string | Yes | Min 10 chars |

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderId": "uuid",
    "userId": "uuid",
    "status": "pending",
    "reason": "Product arrived damaged and not working",
    "adminNote": null,
    "createdAt": "2026-06-02T10:00:00.000Z"
  }
}
```

---

### 11.2 List My Refunds

```http
GET /refunds/my
Authorization: Bearer <token>
```

**Response:** `200 OK` — Array of refund objects.

---

## 12. Payments

Prefix: `/payments`. All require `Authorization: Bearer <token>`.

### 12.1 Submit On-Air Payment

```http
POST /payments/orders/:id/pay
Authorization: Bearer <token>
Content-Type: application/json

{ "transactionId": "TX12345ABC", "phoneNumber": "01912345678" }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `transactionId` | string | Yes | Transaction/reference ID |
| `phoneNumber` | string | Yes | 10–15 digits |

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderId": "uuid",
    "provider": "manual",
    "transactionId": "TX12345ABC",
    "amount": "2499.00",
    "status": "initiated",
    "createdAt": "2026-06-02T10:00:00.000Z",
    "updatedAt": "2026-06-02T10:00:00.000Z"
  },
  "message": "Payment submitted for verification"
}
```

---

### 12.2 Get Order Payments

```http
GET /payments/orders/:id/payment
Authorization: Bearer <token>
```

**Response:** `200 OK` — Array of payment records (same shape as above).

---

## 13. Coupons

Prefix: `/coupons`.

### 13.1 Validate Coupon

```http
POST /coupons/validate
Authorization: Bearer <token>
Content-Type: application/json

{ "code": "SAVE10", "orderAmount": 2499.00 }
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | Coupon code (auto-uppercased) |
| `orderAmount` | number | Yes | Current order subtotal |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "SAVE10",
    "discount": 249.9
  }
}
```

---

## 14. Shipping

Prefix: `/shipping`. Public.

### 14.1 List Shipping Zones & Methods

```http
GET /shipping
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Inside Dhaka",
      "description": "Delivery within Dhaka city",
      "isActive": true,
      "methods": [
        {
          "id": "uuid",
          "name": "Standard Delivery",
          "cost": "60.00",
          "estimatedDays": "1-2 days",
          "isActive": true
        }
      ]
    }
  ]
}
```

---

## 15. Contact

Prefix: `/contact`. Public.

### 15.1 Submit Contact Form

```http
POST /contact
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "01912345678",
  "subject": "Product inquiry",
  "message": "I have a question about your products."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Sender name |
| `email` | string | Yes | Valid email |
| `phone` | string | No | Phone number |
| `subject` | string | No | Subject line |
| `message` | string | Yes | Message body |

**Response:** `201 Created`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "01912345678",
    "subject": "Product inquiry",
    "message": "I have a question about your products.",
    "status": "pending",
    "createdAt": "2026-06-02T10:00:00.000Z"
  },
  "message": "Thank you for your message. We will get back to you soon."
}
```

---

## 16. Search

Prefix: `/search`. Public.

### 16.1 Autocomplete

```http
GET /search/autocomplete?q=wireless
```

| Query | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Search query (min 1 char) |

**Response:** `200 OK`

```json
[
  { "id": "uuid", "name": "Wireless Earbuds", "slug": "wireless-earbuds" },
  { "id": "uuid", "name": "Wireless Charger", "slug": "wireless-charger" }
]
```

---

### 16.2 Full Search

```http
GET /search?q=wireless&minPrice=1000&maxPrice=5000&categoryId=<uuid>&sortBy=price_asc&page=1&limit=20
```

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | — | Search query |
| `minPrice` | number | — | Minimum price |
| `maxPrice` | number | — | Maximum price |
| `categoryId` | uuid | — | Category filter |
| `brandId` | uuid | — | Brand filter |
| `sortBy` | enum | `newest` | `newest`, `price_asc`, `price_desc`, `popular` |
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |

**Response:** `200 OK` — Paginated array of product objects (same shape as product list).

---

## 17. Banners

Prefix: `/banners`. Public.

### 17.1 List Banners

```http
GET /banners
```

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Summer Sale",
      "subtitle": "Up to 50% off",
      "imageUrl": "https://...",
      "linkUrl": "https://rofaar.com/sale",
      "isActive": true,
      "sortOrder": 1
    }
  ]
}
```

---

## 18. Advertisements

Prefix: `/advertisements`. Public.

### 18.1 List Advertisements

```http
GET /advertisements?position=home_banner
```

| Query | Type | Required | Description |
|-------|------|----------|-------------|
| `position` | string | No | Filter by position |

**Response:** `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Special Offer",
      "imageUrl": "https://...",
      "linkUrl": "https://rofaar.com/offer",
      "position": "home_banner",
      "isActive": true
    }
  ]
}
```

---

## 19. Uploads

Prefix: `/uploads`. Requires `Authorization: Bearer <token>` + `create:products` permission.

### 19.1 Upload Image

```http
POST /uploads/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=@image.jpg
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": { "url": "https://r2.dev/products/12345-image.jpg" }
}
```

---

## 20. Health

### 20.1 Health Check

```http
GET /health
```

**Response:** `200 OK`

```json
{
  "status": "ok",
  "timestamp": "2026-06-02T10:00:00.000Z",
  "uptime": 3600
}
```

---

## 21. Integration Flow

```
       Customer                     Your App                   Rofaar API
          |                           |                           |
          |  1. Open app              |                           |
          |-------------------------->|                           |
          |                           |  2. POST /auth/register/send-otp
          |                           |------------------------->|
          |                           |        OTP sent          |
          |                           |<-------------------------|
          |  3. Enter OTP             |                           |
          |-------------------------->|                           |
          |                           |  4. POST /auth/register/verify-otp
          |                           |------------------------->|
          |                           |   { token }              |
          |                           |<-------------------------|
          |  5. Fill profile          |                           |
          |-------------------------->|                           |
          |                           |  6. POST /auth/register/complete
          |                           |------------------------->|
          |                           |   { jwt, refreshToken }  |
          |                           |<-------------------------|
          |                           |                           |
          |  ▼ Store JWT in secure storage                        |
          |                           |                           |
          |  7. Browse products       |                           |
          |-------------------------->|  8. GET /products         |
          |                           |------------------------->|
          |                           |   [products]              |
          |                           |<-------------------------|
          |                           |                           |
          |  9. Add to cart           |                           |
          |-------------------------->|  10. POST /cart           |
          |                           |------------------------->|
          |                           |   { cart item }          |
          |                           |<-------------------------|
          |                           |                           |
          |  11. Checkout             |                           |
          |-------------------------->|  12. POST /orders        |
          |                           |------------------------->|
          |                           |   { orderId }            |
          |                           |<-------------------------|
          |                           |                           |
          |  13. Pay (on_air)         |                           |
          |-------------------------->|  14. POST /payments/.../pay
          |                           |------------------------->|
          |                           |   { payment }            |
          |                           |<-------------------------|
          |                           |                           |
          |  15. Track order          |                           |
          |-------------------------->|  16. GET /orders/:id/track
          |                           |------------------------->|
          |                           |   { order, history }     |
          |                           |<-------------------------|
```

### Quick Start for Frontend Integration

```js
// 1. Register / Login
const loginRes = await fetch("/api/v1/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ phone: "01912345678", password: "pass1234" }),
});
const { data: { token, refreshToken, user } } = await loginRes.json();

// 2. Use token for all subsequent requests
const headers = {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json",
};

// 3. Browse products
const productsRes = await fetch("/api/v1/products?page=1&limit=10", { headers });
const { data: products, pagination } = await productsRes.json();

// 4. Add to cart
const cartRes = await fetch("/api/v1/cart", {
  method: "POST",
  headers,
  body: JSON.stringify({ productId: products[0].id, quantity: 1 }),
});

// 5. Place order
const orderRes = await fetch("/api/v1/orders", {
  method: "POST",
  headers,
  body: JSON.stringify({
    addressId: "uuid",
    paymentMethod: "cod",
    shippingMethodId: "uuid",
  }),
});
```

### Error Codes

| Code | Meaning | What to do |
|------|---------|-----------|
| `UNAUTHORIZED` | Missing or expired token | Re-login or refresh token |
| `FORBIDDEN` | Insufficient permissions | Contact support |
| `BAD_REQUEST` | Validation failed | Check `message` for details |
| `NOT_FOUND` | Resource doesn't exist | Verify the ID/slug |
| `CONFLICT` | Duplicate resource | Already exists |
| `INTERNAL_SERVER_ERROR` | Server error | Retry or contact support |

### Token Refresh Pattern

```js
async function refreshAccessToken(refreshToken) {
  const res = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const { data } = await res.json();
  // Store new token and refreshToken
  return data.token;
}
```

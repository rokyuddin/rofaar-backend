# Rofaar API Documentation

This document provides a high-level overview of the Rofaar E-commerce API. For detailed endpoint references, please refer to the specialized guides below.

## 🚀 Interactive Documentation

For interactive API documentation with the ability to test endpoints directly, visit:

- **Swagger UI (Local):** `http://localhost:3000/documentation`
- **Swagger UI (Production):** `https://api.rofaar.com/documentation`

---

## 📚 Detailed Guides

| Guide | Description |
|-------|-------------|
| **[User (Customer) Guide](./user-api.md)** | Step-by-step reference for customer-facing endpoints (Auth, Catalog, Cart, Checkout, etc.) |
| **[Admin Guide](./admin-api.md)** | Reference for store operators and administrators (Management, Inventory, Fulfillment, Analytics, etc.) |

---

## 🛠️ Core Conventions

### Base URL

```
http://localhost:3000/api/v1
```

### Authentication

Rofaar uses JWT-based authentication. Most routes require a Bearer token in the header:

```http
Authorization: Bearer <your_access_token>
```

### Standard Response Envelope

All API routes return a consistent JSON structure:

**Success (Single Resource):**
```json
{
  "success": true,
  "message": "Optional human-readable message",
  "data": { ... }
}
```

**Success (Paginated List):**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

**Error:**
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "errors": { ... }
}
```

---

## 👥 User Roles

| Role | Description |
|------|-------------|
| `customer` | Standard buyer account. Can browse products, manage cart, and place orders. |
| `operator` | Staff account with limited management access (typically order fulfillment). |
| `admin` | Full management access to catalog, promotions, and store settings. |
| `super_admin` | Unrestricted access to all system features including RBAC. |

---

## 🔄 Common Workflows

### Customer Journey
1. **Auth:** Register/Login via OTP.
2. **Shop:** Browse products, categories, and brands.
3. **Cart:** Add items to cart and manage quantities.
4. **Checkout:** Provide shipping address, select shipping method, and apply coupons.
5. **Order:** Place order and track status.
6. **Feedback:** Review products after delivery.

### Admin Operations
1. **Catalog:** Manage products, categories, and brands.
2. **Inventory:** Adjust stock levels and monitor low stock.
3. **Orders:** Confirm, process, ship, and deliver customer orders.
4. **Marketing:** Create banners, advertisements, and discount coupons.
5. **Support:** Moderate reviews, answer product Q&A, and handle contact submissions.

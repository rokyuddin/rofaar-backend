# Rofaar E-commerce API Documentation (v1 - Updated with Advanced Features)

Base URL:

```
https://api.rofaar.com/api/v1
```

Authentication:

* JWT based authentication
* Send token in header:

```
Authorization: Bearer <token>
```

Standard Success Response:
{
"success": true,
"message": "Optional message",
"data": {}
}

# User Roles & Entities

The `users` table is the central identity table of the system. Every person who interacts with Rofaar—whether a customer, operator, or super_admin—exists in this single table. It stores basic authentication and account information such as name, phone (unique identifier), optional email, password hash, role, and account status.

The `role` field determines what the user is allowed to do (authorization), while the `status` field controls whether the account is active, suspended, or blocked. This design keeps authentication unified, makes role changes easy (for example promoting a customer to operator), and allows the system to scale in the future without creating separate user tables.

---

# 1. AUTH APIs

## 1.1 Customer Authentication

### 1.1.1 Register Customer
POST /auth/customer/register

Body:
{
"name": "string",
"phone": "string",
"password": "string"
}

Response:
{
"success": true,
"message": "OTP sent to phone number"
}

### 1.1.2 Verify OTP (Customer Registration)
POST /auth/customer/verify-otp

Body:
{
"phone": "string",
"otp": "string"
}

Response:
{
"success": true,
"message": "Registration successful",
"token": "jwt",
"user": {...}
}

### 1.1.3 Customer Login
POST /auth/customer/login

Body:
{
"phone": "string",
"password": "string"
}

Response:
{
"success": true,
"token": "jwt",
"user": {...}
}

### 1.1.4 Customer Forgot Password (Send OTP)
POST /auth/customer/forgot-password

Body:
{
"phone": "string"
}

Response:
{
"success": true,
"message": "OTP sent to phone number"
}

### 1.1.5 Customer Reset Password
POST /auth/customer/reset-password

Body:
{
"phone": "string",
"otp": "string",
"newPassword": "string"
}

Response:
{
"success": true,
"message": "Password updated successfully"
}

### 1.1.6 Customer Change Password (Logged In)
POST /auth/customer/change-password
(Requires Bearer Token)

Body:
{
"oldPassword": "string",
"newPassword": "string"
}

Response:
{
"success": true,
"message": "Password changed successfully"
}

### 1.1.7 Get Current Customer
GET /auth/customer/me

Response:
{
"id": "uuid",
"name": "string",
"phone": "string",
"role": "customer"
}

---

## 1.2 Operator Authentication

### 1.2.1 Operator Login
POST /auth/operator/login

Body:
{
"email": "string",
"password": "string"
}

Response:
{
"success": true,
"token": "jwt",
"operator": {...}
}

### 1.2.2 Get Current Operator
GET /auth/operator/me

Response:
{
"id": "uuid",
"name": "string",
"email": "string",
"permissions": ["manage_products", "manage_orders", "manage_users"],
"role": "operator"
}

---

# 2. PRODUCT APIs

## 2.1 Get All Products

GET /products

Query Params:

* page
* limit
* category
* tag
* minPrice
* maxPrice
* search

Response:
{
"data": [...],
"pagination": {
"page": 1,
"limit": 10,
"total": 100
}
}

---

## 2.2 Get Single Product

GET /products/:slug

Response:
{
"id": "uuid",
"name": "string",
"description": "string",
"price": 2500,
"stock": 20,
"images": [...],
"category": {...},
"tags": [...]
}

---

## 2.3 Create Product (Admin)

POST /admin/products

Body:
{
"name": "string",
"description": "string",
"price": 2500,
"stock": 20,
"categoryId": "uuid",
"tagIds": ["uuid"],
"images": ["url"]
}

---

## 2.4 Update Product (Admin)

PUT /admin/products/:id

---

## 2.5 Delete Product (Admin)

DELETE /admin/products/:id

---

# 3. CATEGORY APIs

## 3.1 Get Categories

GET /categories

## 3.2 Create Category (Admin)

POST /admin/categories

## 3.3 Update Category (Admin)

PUT /admin/categories/:id

## 3.4 Delete Category (Admin)

DELETE /admin/categories/:id

---

# 4. TAG APIs

GET /tags
POST /admin/tags
PUT /admin/tags/:id
DELETE /admin/tags/:id

---

# 5. COMBO APIs

## 5.1 Get Combos

GET /combos

## 5.2 Create Combo (Admin)

POST /admin/combos

Body:
{
"name": "string",
"description": "string",
"price": 4500,
"items": [
{
"productId": "uuid",
"quantity": 2
}
]
}

---

## 5.3 Update Combo

PUT /admin/combos/:id

## 5.4 Delete Combo

DELETE /admin/combos/:id

---

# 6. COUPON APIs

## 6.1 Validate Coupon

POST /coupons/validate

Body:
{
"code": "RAMADAN10",
"cartTotal": 5000
}

Response:
{
"valid": true,
"discountAmount": 500
}

---

## 6.2 Create Coupon (Admin)

POST /admin/coupons

## 6.3 Update Coupon

PUT /admin/coupons/:id

## 6.4 Delete Coupon

DELETE /admin/coupons/:id

---

# 7. CART APIs

## 7.1 Get Cart

GET /cart

## 7.2 Add to Cart

POST /cart

Body:
{
"productId": "uuid",
"quantity": 1
}

## 7.3 Update Cart Item

PUT /cart/:itemId

## 7.4 Remove Cart Item

DELETE /cart/:itemId

---

# 8. ADDRESS APIs

GET /addresses
POST /addresses
PUT /addresses/:id
DELETE /addresses/:id

---

# 9. ORDER APIs

## 9.1 Create Order

POST /orders

Body:
{
"addressId": "uuid",
"paymentMethod": "cod | sslcommerz | bkash",
"couponCode": "optional"
}

Response:
{
"orderId": "uuid",
"paymentUrl": "if online payment"
}

---

## 9.2 Get User Orders

GET /orders

## 9.3 Get Order Details

GET /orders/:id

---

# 10. ADMIN ORDER MANAGEMENT

## 10.1 Get All Orders

GET /admin/orders

Query:

* status
* dateFrom
* dateTo

## 10.2 Update Order Status

PATCH /admin/orders/:id/status

Body:
{
"status": "shipped"
}

---

# 11. REPORT APIs (Admin)

## 11.1 Dashboard Summary

GET /admin/reports/summary

Response:
{
"totalRevenue": 100000,
"totalOrders": 150,
"pendingOrders": 10,
"topProducts": [...]
}

---

# 12. PAYMENT WEBHOOK

## 12.1 SSLCommerz Webhook

POST /payments/webhook/sslcommerz

## 12.2 bKash Webhook

POST /payments/webhook/bkash

---

# Order Status Enum

* pending
* confirmed
* processing
* shipped
* delivered
* cancelled
* returned

---

# Payment Status Enum

* unpaid
* paid
* failed
* refunded

#

---

# 13. WISHLIST APIs

---

GET    /wishlist
POST   /wishlist
DELETE /wishlist/:productId

---

# 14. PRODUCT REVIEW APIs

---

GET    /products/:id/reviews
POST   /products/:id/reviews
PUT    /reviews/:id
DELETE /reviews/:id

Review Rules:

* Only users who purchased the product can review
* Rating range: 1 to 5

---

# 15. INVENTORY LOG APIs (Admin Only)

---

GET    /admin/inventory/logs

Log Types:

* stock_increase
* stock_decrease
* order_deduction
* manual_adjustment
* return_restock

---

# 16. REFUND MANAGEMENT APIs

---

POST   /orders/:id/request-refund
GET    /admin/refunds
PATCH  /admin/refunds/:id/approve
PATCH  /admin/refunds/:id/reject
PATCH  /admin/refunds/:id/complete

Refund Status:

* requested
* approved
* rejected
* refunded

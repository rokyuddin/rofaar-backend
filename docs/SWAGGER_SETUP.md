# Swagger UI Implementation Guide

## Overview

This project now includes interactive API documentation using **@fastify/swagger** and **@fastify/swagger-ui**. The Swagger UI provides an interactive interface where developers can:

- Browse all available API endpoints
- View request/response schemas
- Test endpoints directly from the browser
- Authenticate using JWT tokens
- Download the OpenAPI specification

## Installation

The following packages have been added:

```json
{
  "@fastify/swagger": "^9.4.2",
  "@fastify/swagger-ui": "^5.2.1"
}
```

## Configuration

### Environment Variables

Two new environment variables have been added to `.env.example`:

```bash
# API Documentation
ENABLE_SWAGGER=true
API_HOST=localhost:3000
```

- `ENABLE_SWAGGER`: Toggle Swagger UI on/off (useful for production)
- `API_HOST`: The host URL for the API server

### Plugin Setup

The Swagger plugin is configured in `src/plugins/swagger.ts` with:

- **OpenAPI 3.0 Specification**: Modern API documentation standard
- **JWT Authentication**: Bearer token support built-in
- **Multiple Servers**: Development and production server definitions
- **Organized Tags**: Endpoints grouped by feature area

### Features Implemented

#### 1. **Global Configuration** (`src/plugins/swagger.ts`)

```typescript
- OpenAPI info (title, description, version)
- Server definitions (dev & production)
- Security schemes (JWT Bearer)
- Tag definitions for all modules
- UI customization options
```

#### 2. **Route Documentation Helper** (`src/shared/swagger.ts`)

Provides utility functions:
- `createSwaggerConfig()`: Adds tags, summaries, and descriptions to routes
- `zodToJsonSchema()`: Converts Zod schemas to OpenAPI-compatible JSON schemas

#### 3. **Documented Routes**

All major routes have been updated with Swagger documentation:

✅ **Authentication Module**
- Customer registration, login, OTP verification
- Password reset and change password
- Operator login and profile

✅ **Products Module**
- List products with filtering
- Get product by slug

✅ **Cart Module**
- Get cart
- Add/update/remove items

✅ **Orders Module**
- Create order
- List orders
- Get order details

✅ **Categories & Tags**
- List categories
- List tags

✅ **Wishlist Module**
- Get wishlist
- Add/remove items

✅ **Other Modules** (stubs documented)
- Addresses
- Coupons
- Combos
- Reviews
- Payments
- Admin

## Usage

### Accessing Swagger UI

Once the server is running, access the interactive documentation at:

**Development:**
```
http://localhost:3000/documentation
```

**Production:**
```
https://api.rofaar.com/documentation
```

### Using the Documentation

1. **Browse Endpoints**: Click on any endpoint to expand details
2. **Try It Out**: Click "Try it out" to enable testing
3. **Provide Parameters**: Fill in required parameters
4. **Authenticate**: For protected endpoints, provide your JWT token
5. **Execute**: Click "Execute" to send the request
6. **View Response**: See the response with status code and headers

### JWT Authentication

To authenticate requests:

1. Click the **Authorize** button at the top
2. Enter your JWT token in the format: `Bearer <your-token>`
3. Click **Authorize**
4. All subsequent requests will include the token automatically

Or you can enter just the token value (without "Bearer") as the security scheme is configured globally.

## Adding Documentation to New Routes

When adding new routes, follow this pattern:

```typescript
import { createSwaggerConfig } from '@/shared/swagger.js';

f.post('/endpoint', {
    schema: {
        ...createSwaggerConfig(
            ['TagName'],           // Tag for grouping
            'Endpoint Title',      // Short title
            'Detailed description', // Longer description
            true                   // Require auth? (default: true)
        ),
        body: YourBodySchema,
        response: { 200: ResponseSchema },
    },
    handler: async (request, reply) => {
        // Your handler logic
    },
});
```

### Available Tags

Use these predefined tags for consistency:

- `Authentication` - User auth endpoints
- `Products` - Product catalog
- `Categories` - Category management
- `Cart` - Shopping cart operations
- `Orders` - Order management
- `Wishlist` - Wishlist operations
- `Addresses` - Address management
- `Coupons` - Coupon validation
- `Combos` - Product bundles
- `Reviews` - Product reviews
- `Payments` - Payment processing
- `Admin` - Administrative endpoints

## Customization

### UI Configuration

Edit `src/plugins/swagger.ts` to customize:

```typescript
await fastify.register(fastifySwaggerUI, {
    routePrefix: '/documentation',
    uiConfig: {
        docExpansion: 'list',      // Expand level: 'list' | 'full' | 'none'
        deepLinking: false,         // Deep linking into docs
        filter: true,               // Show search box
    },
    staticCSP: true,                // Content Security Policy
    transformSpecificationClone: true,
});
```

### OpenAPI Specification

Modify the `openapi` object in `src/plugins/swagger.ts` to:
- Change API info (title, description, contact)
- Add more servers
- Update security schemes
- Modify default tags

## Disabling in Production

To disable Swagger UI in production:

```bash
# In .env file
ENABLE_SWAGGER=false
```

This prevents the plugin from registering when not needed.

## Downloading OpenAPI Spec

Users can download the complete OpenAPI specification in JSON format at:

```
http://localhost:3000/documentation/json
```

This is useful for:
- Importing into Postman
- Generating API clients
- Integration with other tools
- Offline documentation

## Benefits

### For Developers

✅ Always up-to-date documentation (generated from code)
✅ Interactive testing without external tools
✅ Clear request/response schemas
✅ Built-in authentication testing
✅ Reduces onboarding time

### For API Consumers

✅ Self-service API exploration
✅ Try before implementing
✅ Downloadable spec for client generation
✅ Clear error examples
✅ Reduced support requests

### For the Project

✅ Better developer experience
✅ Professional API presentation
✅ Easier maintenance (docs = code)
✅ Attracts more developers
✅ Industry standard documentation

## Troubleshooting

### Swagger UI Not Loading

1. Check `ENABLE_SWAGGER=true` in `.env`
2. Verify plugins are installed: `pnpm list @fastify/swagger @fastify/swagger-ui`
3. Check console for registration errors

### Routes Not Showing Tags

Ensure you're using `createSwaggerConfig()` in the route schema:

```typescript
schema: {
    ...createSwaggerConfig(['TagName'], 'Title', 'Description'),
    // ... rest of schema
}
```

### Authentication Not Working

1. Verify JWT token is valid
2. Check token hasn't expired
3. Ensure route has proper auth hooks (`onRequest: [fastify.authenticate]`)

## Next Steps

### Phase 1: Complete Route Documentation
- [ ] Add detailed descriptions to all endpoints
- [ ] Document all request/response schemas
- [ ] Add example values to schemas

### Phase 2: Enhanced Features
- [ ] Add custom CSS branding
- [ ] Include response examples
- [ ] Add error response schemas
- [ ] Document rate limiting

### Phase 3: Advanced Documentation
- [ ] Add tutorial/guide sections
- [ ] Include code examples (cURL, JavaScript, Python)
- [ ] Create getting started guide
- [ ] Add changelog section

## Resources

- [@fastify/swagger Documentation](https://github.com/fastify/fastify-swagger)
- [@fastify/swagger-ui Documentation](https://github.com/fastify/fastify-swagger-ui)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Swagger UI Configuration](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/)

---

**Implementation Date**: March 4, 2026  
**Status**: ✅ Complete (Basic Implementation)  
**Next Review**: After completing remaining route implementations

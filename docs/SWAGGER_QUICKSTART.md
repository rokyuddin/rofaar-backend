# Swagger UI Quick Reference

## 🚀 Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Start server
pnpm dev

# 4. Open documentation
http://localhost:3000/documentation
```

## 🔑 Key URLs

| Resource | URL |
|----------|-----|
| **Swagger UI** | `http://localhost:3000/documentation` |
| **OpenAPI JSON** | `http://localhost:3000/documentation/json` |
| **Health Check** | `http://localhost:3000/health` |

## 📖 Using Swagger UI

### Browse Endpoints
1. Open http://localhost:3000/documentation
2. Click on any endpoint to expand details
3. View parameters, request/response schemas

### Test Endpoints
1. Click **"Try it out"** button
2. Fill in required parameters
3. Click **"Execute"**
4. View response in the panel below

### Authenticate
1. Click **"Authorize"** button (top right)
2. Enter JWT token: `your-token-here`
3. Click **"Authorize"**
4. All protected endpoints now use your token

### Download Spec
- Click "Download" button in top right
- Or visit: http://localhost:3000/documentation/json

## 🏷️ API Categories

Endpoints are organized by tags:

- 🔐 **Authentication** - Login, register, OTP
- 📦 **Products** - Browse catalog
- 🛒 **Cart** - Shopping cart operations
- 📋 **Orders** - Order management
- ❤️ **Wishlist** - Save favorite products
- 📂 **Categories** - Product categories
- 🏷️ **Tags** - Product tags
- 🎟️ **Coupons** - Discount codes
- 🎁 **Combos** - Product bundles
- ⭐ **Reviews** - Product ratings
- 💳 **Payments** - Payment processing
- 📍 **Addresses** - Saved addresses
- 👨‍💼 **Admin** - Administrative endpoints

## 🛠️ Environment Variables

```bash
# Enable/disable Swagger
ENABLE_SWAGGER=true

# Configure server URL
API_HOST=localhost:3000
```

## 📝 Adding Documentation

For new routes, use this pattern:

```typescript
import { createSwaggerConfig } from '@/shared/swagger.js';

f.post('/endpoint', {
    schema: {
        ...createSwaggerConfig(
            ['TagName'],           // Category
            'Endpoint Title',      // Short title
            'Description here',    // Details
            true                   // Needs auth?
        ),
        body: YourSchema,
        response: { 200: ResponseSchema }
    },
    handler: async (request, reply) => {
        // Handler code
    }
});
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Search endpoints |
| `Enter` | Execute endpoint |
| `Esc` | Close expanded view |

## 🎯 Common Tasks

### Get JWT Token
```bash
# Use the login endpoint in Swagger UI
POST /api/v1/auth/customer/login
Body: { "phone": "...", "password": "..." }
```

### Test Protected Endpoint
1. Login to get JWT token
2. Copy token from response
3. Click "Authorize"
4. Paste token
5. Try any protected endpoint

### View Response Schema
1. Expand endpoint
2. Look at "Responses" section
3. See expected response format

## 🐛 Troubleshooting

### Can't access Swagger UI?
- ✅ Server running? Check terminal
- ✅ ENABLE_SWAGGER=true in .env?
- ✅ Correct port? Default is 3000

### Routes not showing?
- ✅ Route registered in app.ts?
- ✅ Has schema definition?
- ✅ Using createSwaggerConfig?

### Authentication failing?
- ✅ Token valid and not expired?
- ✅ Including "Bearer" prefix? (optional)
- ✅ Route has auth hook?

## 📚 More Info

- Full guide: `/docs/SWAGGER_SETUP.md`
- Implementation: `/docs/IMPLEMENTATION_SUMMARY.md`
- API reference: `/docs/api.md`
- Main README: `/README.md`

---

**Need help?** Check `/docs/SWAGGER_SETUP.md` for detailed documentation.

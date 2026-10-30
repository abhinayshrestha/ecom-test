# inquest-demo-shop

Small Express e-commerce API with in-memory data (resets on restart). Four endpoints are
intentionally slow to give tracing/latency tooling something to find.

```bash
npm install
npm start                      # http://localhost:3000
SLOW_DELAY_MS=5000 npm start   # change the delay (default 2000 ms)
```

| # | Endpoint | Notes |
|---|----------|-------|
| 1 | `GET /api/products` | `?category=&minPrice=&maxPrice=&inStock=true&sort=-price&page=&limit=` |
| 2 | `GET /api/products/search?q=` | **slow** (unindexed search) |
| 3 | `GET /api/products/:id` | |
| 4 | `GET /api/categories` | |
| 5 | `POST /api/auth/login` | `{"email":"alice@example.com","password":"password123"}` |
| 6 | `GET /api/cart/:userId` | users `u-1`, `u-2` |
| 7 | `POST /api/cart/:userId/items` | `{"productId":"p-3002","quantity":1}` |
| 8 | `POST /api/checkout` | **slow** (payment gateway); `{"userId":"u-1","shippingAddress":{"line1":"1 Main St","city":"Austin","postalCode":"78701"}}` |
| 9 | `GET /api/orders/:orderId` | **slow** (carrier tracking) |
| 10 | `GET /api/recommendations/:userId` | **slow** (recommendation model) |

Plus `GET /health`. Every response carries an `x-request-id` header, and each request is
logged with its duration.

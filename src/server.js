import crypto from 'node:crypto';
import express from 'express';
import {
  carts,
  categories,
  orders,
  products,
  sessions,
  users,
} from './data.js';

const PORT = Number(process.env.PORT ?? 3000);
// Delay for the intentionally slow endpoints (marked SLOW below).
const SLOW_DELAY_MS = Number(process.env.SLOW_DELAY_MS ?? 3000);

const app = express();
app.use(express.json());

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const round2 = (n) => Math.round(n * 100) / 100;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Request id + access log with timing.
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  req.id = req.get('x-request-id') ?? crypto.randomUUID();
  res.set('x-request-id', req.id);
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(
      `${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(1)}ms id=${req.id}`,
    );
  });
  next();
});

function findProduct(id) {
  const product = products.find((p) => p.id === id);
  if (!product) throw new HttpError(404, `product ${id} not found`);
  return product;
}

function findUser(id) {
  const user = users.find((u) => u.id === id);
  if (!user) throw new HttpError(404, `user ${id} not found`);
  return user;
}

function cartSummary(userId) {
  const items = (carts.get(userId) ?? []).map(({ productId, quantity }) => {
    const p = findProduct(productId);
    return {
      productId,
      name: p.name,
      unitPrice: p.price,
      quantity,
      lineTotal: round2(p.price * quantity),
    };
  });
  const subtotal = round2(items.reduce((sum, i) => sum + i.lineTotal, 0));
  return {
    userId,
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    subtotal,
  };
}

app.get('/health', (req, res) =>
  res.json({ status: 'ok', uptime: process.uptime() }),
);

// 1. List products: ?category=&minPrice=&maxPrice=&inStock=true&sort=price|-price|rating&page=&limit=
app.get('/api/products', (req, res) => {
  const { category, minPrice, maxPrice, inStock, sort } = req.query;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));

  let result = products.filter(
    (p) =>
      (!category || p.category === category) &&
      (minPrice === undefined || p.price >= Number(minPrice)) &&
      (maxPrice === undefined || p.price <= Number(maxPrice)) &&
      (inStock !== 'true' || p.stock > 0),
  );
  if (sort) {
    const desc = sort.startsWith('-');
    const key = desc ? sort.slice(1) : sort;
    if (!['price', 'rating', 'name'].includes(key))
      throw new HttpError(400, `cannot sort by ${key}`);
    result = [...result].sort(
      (a, b) =>
        (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (desc ? -1 : 1),
    );
  }

  res.json({
    data: result.slice((page - 1) * limit, page * limit),
    pagination: {
      page,
      limit,
      total: result.length,
      totalPages: Math.ceil(result.length / limit),
    },
  });
});

// 2. Search products. SLOW: simulates an unindexed full-text search.
app.get('/api/products/search', async (req, res) => {
  const q = String(req.query.q ?? '')
    .trim()
    .toLowerCase();
  if (q.length < 2)
    throw new HttpError(400, 'query parameter q must be at least 2 characters');
  await sleep(SLOW_DELAY_MS);
  const data = products.filter(
    (p) => p.name.toLowerCase().includes(q) || p.category.includes(q),
  );
  res.json({ query: q, count: data.length, data });
});

// 3. Product details.
app.get('/api/products/:id', (req, res) => {
  const product = findProduct(req.params.id);
  res.json({ ...product, available: product.stock > 0 });
});

// 4. Categories with product counts.
app.get('/api/categories', (req, res) => {
  res.json({
    data: categories.map((c) => ({
      ...c,
      productCount: products.filter((p) => p.category === c.id).length,
    })),
  });
});

// 5. Login: returns a session token.
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password)
    throw new HttpError(400, 'email and password are required');
  const user = users.find(
    (u) => u.email === String(email).toLowerCase() && u.password === password,
  );
  if (!user) throw new HttpError(401, 'invalid email or password');
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, user.id);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

// 6. View cart.
app.get('/api/cart/:userId', (req, res) => {
  findUser(req.params.userId);
  res.json(cartSummary(req.params.userId));
});

// 7. Add item to cart (or increase quantity).
app.post('/api/cart/:userId/items', (req, res) => {
  const { userId } = req.params;
  findUser(userId);
  const { productId, quantity = 1 } = req.body ?? {};
  if (!productId) throw new HttpError(400, 'productId is required');
  if (!Number.isInteger(quantity) || quantity < 1)
    throw new HttpError(400, 'quantity must be a positive integer');
  const product = findProduct(productId);

  const cart = carts.get(userId) ?? [];
  const line = cart.find((i) => i.productId === productId);
  const wanted = (line?.quantity ?? 0) + quantity;
  if (wanted > product.stock)
    throw new HttpError(409, `only ${product.stock} of ${productId} in stock`);
  if (line) line.quantity = wanted;
  else cart.push({ productId, quantity });
  carts.set(userId, cart);

  res.status(201).json(cartSummary(userId));
});

// 8. Checkout. SLOW: simulates a payment gateway round trip.
app.post('/api/checkout', async (req, res) => {
  // await sleep(SLOW_DELAY_MS);
  const { userId, shippingAddress, paymentMethod = 'card' } = req.body ?? {};
  findUser(userId);
  if (
    !shippingAddress?.line1 ||
    !shippingAddress?.city ||
    !shippingAddress?.postalCode
  ) {
    throw new HttpError(
      400,
      'shippingAddress needs line1, city and postalCode',
    );
  }
  const cart = cartSummary(userId);
  if (cart.items.length === 0) throw new HttpError(400, 'cart is empty');
  for (const item of cart.items) {
    if (item.quantity > findProduct(item.productId).stock)
      throw new HttpError(409, `${item.productId} is out of stock`);
  }

  for (const item of cart.items)
    findProduct(item.productId).stock -= item.quantity;
  const shipping = cart.subtotal >= 75 ? 0 : 5.99;
  const tax = round2(cart.subtotal * 0.08);
  const order = {
    id: `ord-${crypto.randomBytes(4).toString('hex')}`,
    userId,
    items: cart.items,
    subtotal: cart.subtotal,
    shipping,
    tax,
    total: round2(cart.subtotal + shipping + tax),
    paymentMethod,
    paymentStatus: 'captured',
    status: 'confirmed',
    shippingAddress,
    createdAt: new Date().toISOString(),
  };
  orders.set(order.id, order);
  carts.set(userId, []);
  res.status(201).json(order);
});

// 9. Order details with tracking. SLOW: simulates a carrier tracking lookup.
app.get('/api/orders/:orderId', async (req, res) => {
  const order = orders.get(req.params.orderId);
  if (!order) throw new HttpError(404, `order ${req.params.orderId} not found`);
  await sleep(SLOW_DELAY_MS);
  const eta = new Date(Date.parse(order.createdAt) + 3 * 24 * 3600 * 1000);
  res.json({
    ...order,
    tracking: {
      carrier: 'DemoExpress',
      trackingNumber: `DX${order.id.slice(4).toUpperCase()}`,
      estimatedDelivery: eta.toISOString().slice(0, 10),
    },
  });
});

// 10. Recommendations. SLOW: simulates a call to a recommendation model.
app.get('/api/recommendations/:userId', async (req, res) => {
  const { userId } = req.params;
  findUser(userId);
  await sleep(SLOW_DELAY_MS);
  const inCart = new Set((carts.get(userId) ?? []).map((i) => i.productId));
  const cartCategories = new Set(
    [...inCart].map((id) => findProduct(id).category),
  );
  const data = products
    .filter((p) => !inCart.has(p.id) && p.stock > 0)
    .sort(
      (a, b) =>
        Number(cartCategories.has(b.category)) -
          Number(cartCategories.has(a.category)) || b.rating - a.rating,
    )
    .slice(0, 5)
    .map(({ id, name, price, rating }) => ({ id, name, price, rating }));
  res.json({ userId, data });
});

app.use((req, res) =>
  res.status(404).json({
    error: 'not_found',
    message: `no route for ${req.method} ${req.path}`,
  }),
);

app.use((err, req, res, next) => {
  const status = err.status ?? (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({
    error: status >= 500 ? 'internal_error' : 'request_error',
    message: status >= 500 ? 'something went wrong' : err.message,
    requestId: req.id,
  });
});

app.listen(PORT, () => {
  console.log(
    `shop api listening on http://localhost:${PORT} (slow endpoints: ${SLOW_DELAY_MS}ms)`,
  );
});

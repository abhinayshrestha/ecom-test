// In-memory seed data. Resets on every restart.

export const categories = [
  { id: "electronics", name: "Electronics" },
  { id: "home", name: "Home & Kitchen" },
  { id: "apparel", name: "Apparel" },
  { id: "sports", name: "Sports & Outdoors" },
];

export const products = [
  { id: "p-1001", name: "Wireless Noise-Cancelling Headphones", category: "electronics", price: 199.99, stock: 42, rating: 4.6 },
  { id: "p-1002", name: "4K Streaming Stick", category: "electronics", price: 49.99, stock: 120, rating: 4.4 },
  { id: "p-1003", name: "Mechanical Keyboard", category: "electronics", price: 89.0, stock: 15, rating: 4.7 },
  { id: "p-1004", name: "USB-C Fast Charger 65W", category: "electronics", price: 34.5, stock: 0, rating: 4.3 },
  { id: "p-2001", name: "Cast Iron Skillet 12in", category: "home", price: 39.95, stock: 60, rating: 4.8 },
  { id: "p-2002", name: "Pour-Over Coffee Set", category: "home", price: 27.0, stock: 33, rating: 4.5 },
  { id: "p-2003", name: "Memory Foam Pillow", category: "home", price: 45.0, stock: 18, rating: 4.1 },
  { id: "p-3001", name: "Merino Wool Crew Sweater", category: "apparel", price: 79.0, stock: 25, rating: 4.4 },
  { id: "p-3002", name: "Everyday Running Shoes", category: "apparel", price: 119.0, stock: 40, rating: 4.6 },
  { id: "p-3003", name: "Waterproof Rain Jacket", category: "apparel", price: 140.0, stock: 9, rating: 4.2 },
  { id: "p-4001", name: "Yoga Mat 6mm", category: "sports", price: 29.99, stock: 75, rating: 4.5 },
  { id: "p-4002", name: "Insulated Water Bottle 1L", category: "sports", price: 24.0, stock: 200, rating: 4.7 },
  { id: "p-4003", name: "Adjustable Dumbbells (pair)", category: "sports", price: 249.0, stock: 6, rating: 4.6 },
];

export const users = [
  { id: "u-1", email: "alice@example.com", password: "password123", name: "Alice Chen" },
  { id: "u-2", email: "bob@example.com", password: "password123", name: "Bob Patel" },
];

// userId -> [{ productId, quantity }]
export const carts = new Map([
  ["u-1", [{ productId: "p-1002", quantity: 1 }, { productId: "p-4002", quantity: 2 }]],
  ["u-2", []],
]);

// orderId -> order
export const orders = new Map();

// token -> userId
export const sessions = new Map();

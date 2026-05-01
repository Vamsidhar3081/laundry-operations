const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const { readDB, writeDB } = require("../utils/db");
const { getPrice, getDeliveryDays, GARMENT_PRICES } = require("../utils/pricing");

const VALID_STATUSES = ["RECEIVED", "PROCESSING", "READY", "DELIVERED"];

// GET /api/orders/prices - return price list
router.get("/prices", (req, res) => {
  res.json({ prices: GARMENT_PRICES });
});

// POST /api/orders - Create new order
router.post("/", (req, res) => {
  const { customerName, phone, garments } = req.body;

  // Validation
  if (!customerName || !phone || !garments || !Array.isArray(garments) || garments.length === 0) {
    return res.status(400).json({
      error: "customerName, phone, and garments[] are required",
    });
  }

  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: "Invalid phone number (10-digit Indian number)" });
  }

  // Build garment list with prices
  const processedGarments = garments.map((g) => {
    const pricePerItem = getPrice(g.type);
    const qty = parseInt(g.quantity) || 1;
    return {
      type: g.type.toLowerCase().trim(),
      quantity: qty,
      pricePerItem,
      subtotal: pricePerItem * qty,
    };
  });

  const totalAmount = processedGarments.reduce((sum, g) => sum + g.subtotal, 0);
  const deliveryDays = getDeliveryDays(processedGarments);
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + deliveryDays);

  const order = {
    orderId: "ORD-" + uuidv4().slice(0, 8).toUpperCase(),
    customerName: customerName.trim(),
    phone: phone.trim(),
    garments: processedGarments,
    totalAmount,
    status: "RECEIVED",
    estimatedDelivery: estimatedDelivery.toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const db = readDB();
  db.orders.push(order);
  writeDB(db);

  res.status(201).json({ success: true, order });
});

// GET /api/orders - List all orders with optional filters
router.get("/", (req, res) => {
  const { status, name, phone, garmentType } = req.query;
  const db = readDB();
  let orders = db.orders;

  if (status) {
    orders = orders.filter((o) => o.status === status.toUpperCase());
  }
  if (name) {
    orders = orders.filter((o) =>
      o.customerName.toLowerCase().includes(name.toLowerCase())
    );
  }
  if (phone) {
    orders = orders.filter((o) => o.phone.includes(phone));
  }
  if (garmentType) {
    orders = orders.filter((o) =>
      o.garments.some((g) => g.type.includes(garmentType.toLowerCase()))
    );
  }

  // Sort by newest first
  orders = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ success: true, count: orders.length, orders });
});

// GET /api/orders/:id - Get single order
router.get("/:id", (req, res) => {
  const db = readDB();
  const order = db.orders.find((o) => o.orderId === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  res.json({ success: true, order });
});

// PATCH /api/orders/:id/status - Update order status
router.patch("/:id/status", (req, res) => {
  const { status } = req.body;

  if (!status || !VALID_STATUSES.includes(status.toUpperCase())) {
    return res.status(400).json({
      error: `Status must be one of: ${VALID_STATUSES.join(", ")}`,
    });
  }

  const db = readDB();
  const idx = db.orders.findIndex((o) => o.orderId === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Order not found" });

  db.orders[idx].status = status.toUpperCase();
  db.orders[idx].updatedAt = new Date().toISOString();
  writeDB(db);

  res.json({ success: true, order: db.orders[idx] });
});

// DELETE /api/orders/:id - Delete order (bonus)
router.delete("/:id", (req, res) => {
  const db = readDB();
  const idx = db.orders.findIndex((o) => o.orderId === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Order not found" });

  db.orders.splice(idx, 1);
  writeDB(db);
  res.json({ success: true, message: "Order deleted" });
});

module.exports = router;

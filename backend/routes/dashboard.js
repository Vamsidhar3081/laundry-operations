const express = require("express");
const router = express.Router();
const { readDB } = require("../utils/db");

// GET /api/dashboard
router.get("/", (req, res) => {
  const db = readDB();
  const orders = db.orders;

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  const statusCounts = {
    RECEIVED: 0,
    PROCESSING: 0,
    READY: 0,
    DELIVERED: 0,
  };

  for (const o of orders) {
    if (statusCounts[o.status] !== undefined) {
      statusCounts[o.status]++;
    }
  }

  // Today's orders
  const today = new Date().toISOString().split("T")[0];
  const todayOrders = orders.filter((o) => o.createdAt.startsWith(today));
  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Most popular garment
  const garmentCount = {};
  for (const o of orders) {
    for (const g of o.garments) {
      garmentCount[g.type] = (garmentCount[g.type] || 0) + g.quantity;
    }
  }
  const topGarment = Object.entries(garmentCount).sort((a, b) => b[1] - a[1])[0];

  // Recent 5 orders
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  res.json({
    success: true,
    dashboard: {
      totalOrders,
      totalRevenue,
      ordersPerStatus: statusCounts,
      todayOrders: todayOrders.length,
      todayRevenue,
      topGarment: topGarment ? { type: topGarment[0], count: topGarment[1] } : null,
      recentOrders,
    },
  });
});

module.exports = router;

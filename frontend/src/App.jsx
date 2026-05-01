import { useState, useEffect, useCallback } from "react";

const API = "/api";

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return <div className={`toast ${type}`}>{msg}</div>;
}

// ─── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const icons = { RECEIVED: "📥", PROCESSING: "⚙️", READY: "✅", DELIVERED: "🚚" };
  return (
    <span className={`status-pill status-${status}`}>
      {icons[status]} {status}
    </span>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/dashboard`)
      .then((r) => r.json())
      .then((d) => { setData(d.dashboard); setLoading(false); })
      .catch(() => { showToast("Failed to load dashboard", "error"); setLoading(false); });
  }, []);

  if (loading) return <div style={{ color: "var(--stone)" }}>Loading…</div>;
  if (!data) return null;

  const d = data;
  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your laundry operations today</p>
      </div>

      <div className="stat-grid">
        <div className="stat-card accent">
          <div className="stat-icon">🧺</div>
          <div className="stat-value">{d.totalOrders}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon">💰</div>
          <div className="stat-value">₹{d.totalRevenue.toLocaleString()}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{d.todayOrders}</div>
          <div className="stat-label">Today's Orders</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon">💵</div>
          <div className="stat-value">₹{d.todayRevenue.toLocaleString()}</div>
          <div className="stat-label">Today's Revenue</div>
        </div>
      </div>

      <div className="status-bar-wrap">
        {Object.entries(d.ordersPerStatus).map(([status, count]) => (
          <div key={status} className="status-bar-item">
            <div className={`dot dot-${status}`} />
            <div>
              <div className="count">{count}</div>
              <div className="label">{status}</div>
            </div>
          </div>
        ))}
      </div>

      {d.topGarment && (
        <div className="card" style={{ marginBottom: 20, display: "inline-flex", gap: 12, alignItems: "center" }}>
          <span style={{ fontSize: 24 }}>👕</span>
          <div>
            <div style={{ fontSize: 12, color: "var(--stone-light)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Most Popular Item</div>
            <div style={{ fontFamily: "DM Serif Display, serif", fontSize: 18 }}>
              {d.topGarment.type.charAt(0).toUpperCase() + d.topGarment.type.slice(1)}
              <span style={{ color: "var(--stone)", fontFamily: "DM Sans, sans-serif", fontSize: 13 }}> — {d.topGarment.count} pcs</span>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-title">Recent Orders</div>
        {d.recentOrders.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🧺</div>
            <h3>No orders yet</h3>
            <p>Create your first order to get started</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {d.recentOrders.map((o) => (
                  <tr key={o.orderId}>
                    <td><span className="order-id">{o.orderId}</span></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{o.customerName}</div>
                      <div style={{ fontSize: 12, color: "var(--stone-light)" }}>{o.phone}</div>
                    </td>
                    <td style={{ color: "var(--stone)" }}>{o.garments.map(g => `${g.quantity}× ${g.type}`).join(", ")}</td>
                    <td style={{ fontWeight: 600 }}>₹{o.totalAmount}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td style={{ color: "var(--stone-light)" }}>{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Order ─────────────────────────────────────────────────────────────
const DEFAULT_PRICES = {
  shirt: 40, pants: 50, saree: 120, "t-shirt": 35, suit: 200,
  jacket: 150, dress: 100, kurta: 60, lehenga: 180, blazer: 160,
  jeans: 55, shorts: 35, bedsheet: 80, curtain: 90, towel: 30,
};

function CreateOrder({ showToast }) {
  const [form, setForm] = useState({ customerName: "", phone: "" });
  const [garments, setGarments] = useState([{ type: "shirt", quantity: 1 }]);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  const totalBill = garments.reduce((sum, g) => {
    return sum + (DEFAULT_PRICES[g.type] || 50) * (parseInt(g.quantity) || 1);
  }, 0);

  const addGarment = () => setGarments([...garments, { type: "shirt", quantity: 1 }]);

  const updateGarment = (idx, field, val) => {
    const updated = [...garments];
    updated[idx][field] = val;
    setGarments(updated);
  };

  const removeGarment = (idx) => {
    if (garments.length === 1) return;
    setGarments(garments.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!form.customerName.trim()) return showToast("Customer name is required", "error");
    if (!form.phone.match(/^[6-9]\d{9}$/)) return showToast("Enter valid 10-digit phone", "error");

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          phone: form.phone,
          garments: garments.map(g => ({ type: g.type, quantity: parseInt(g.quantity) || 1 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreatedOrder(data.order);
      setForm({ customerName: "", phone: "" });
      setGarments([{ type: "shirt", quantity: 1 }]);
      showToast("Order created successfully!", "success");
    } catch (e) {
      showToast(e.message || "Failed to create order", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>New Order</h2>
        <p>Fill in customer details and add garments</p>
      </div>

      {createdOrder && (
        <div className="success-card">
          <h3>✅ Order Created!</h3>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 8 }}>
            <div><span style={{ color: "var(--stone)", fontSize: 12 }}>ORDER ID</span><br /><strong className="order-id">{createdOrder.orderId}</strong></div>
            <div><span style={{ color: "var(--stone)", fontSize: 12 }}>CUSTOMER</span><br /><strong>{createdOrder.customerName}</strong></div>
            <div><span style={{ color: "var(--stone)", fontSize: 12 }}>TOTAL</span><br /><strong>₹{createdOrder.totalAmount}</strong></div>
            <div><span style={{ color: "var(--stone)", fontSize: 12 }}>DELIVERY BY</span><br /><strong>{createdOrder.estimatedDelivery}</strong></div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setCreatedOrder(null)}>Create Another</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
        <div className="card">
          <div className="section-title">Customer Info</div>
          <div className="form-row">
            <div className="form-group">
              <label>Customer Name</label>
              <input
                placeholder="Rajesh Kumar"
                value={form.customerName}
                onChange={e => setForm({ ...form, customerName: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                placeholder="9876543210"
                value={form.phone}
                maxLength={10}
                onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
              />
            </div>
          </div>

          <div className="section-title" style={{ marginTop: 8 }}>Garments</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 90px 32px", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: "var(--stone-light)", fontWeight: 600, textTransform: "uppercase" }}>Type</span>
            <span style={{ fontSize: 11, color: "var(--stone-light)", fontWeight: 600, textTransform: "uppercase" }}>Qty</span>
            <span style={{ fontSize: 11, color: "var(--stone-light)", fontWeight: 600, textTransform: "uppercase" }}>Price</span>
            <span />
          </div>

          {garments.map((g, idx) => (
            <div key={idx} className="garment-row">
              <select value={g.type} onChange={e => updateGarment(idx, "type", e.target.value)}>
                {Object.keys(DEFAULT_PRICES).map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={g.quantity}
                onChange={e => updateGarment(idx, "quantity", e.target.value)}
              />
              <div style={{ padding: "9px 10px", background: "var(--accent-pale)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
                ₹{(DEFAULT_PRICES[g.type] || 50) * (parseInt(g.quantity) || 1)}
              </div>
              <button className="remove-btn" onClick={() => removeGarment(idx)}>×</button>
            </div>
          ))}

          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={addGarment}>
            + Add Garment
          </button>

          <div className="bill-box">
            {garments.map((g, idx) => (
              <div key={idx} className="bill-row">
                <span>{g.type.charAt(0).toUpperCase() + g.type.slice(1)} × {g.quantity}</span>
                <span>₹{(DEFAULT_PRICES[g.type] || 50) * (parseInt(g.quantity) || 1)}</span>
              </div>
            ))}
            <div className="bill-total">
              <span>Total</span>
              <span>₹{totalBill}</span>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 16 }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Creating…" : "🧺 Place Order"}
          </button>
        </div>

        {/* Price list */}
        <div className="card" style={{ alignSelf: "start" }}>
          <div className="section-title">Price List</div>
          <table>
            <thead>
              <tr>
                <th>Garment</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(DEFAULT_PRICES).map(([type, price]) => (
                <tr key={type}>
                  <td>{type.charAt(0).toUpperCase() + type.slice(1)}</td>
                  <td style={{ fontWeight: 600, color: "var(--accent)" }}>₹{price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Orders List ──────────────────────────────────────────────────────────────
function OrdersList({ showToast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "", name: "", phone: "", garmentType: "" });
  const [statusModal, setStatusModal] = useState(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.name) params.set("name", filters.name);
    if (filters.phone) params.set("phone", filters.phone);
    if (filters.garmentType) params.set("garmentType", filters.garmentType);

    try {
      const res = await fetch(`${API}/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      showToast("Failed to load orders", "error");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const updateStatus = async (orderId, status) => {
    try {
      const res = await fetch(`${API}/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast(`Status updated to ${status}`, "success");
      setStatusModal(null);
      fetchOrders();
    } catch {
      showToast("Failed to update status", "error");
    }
  };

  const deleteOrder = async (orderId) => {
    if (!confirm("Delete this order?")) return;
    try {
      await fetch(`${API}/orders/${orderId}`, { method: "DELETE" });
      showToast("Order deleted", "success");
      fetchOrders();
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  const STATUSES = ["RECEIVED", "PROCESSING", "READY", "DELIVERED"];

  return (
    <div>
      <div className="page-header">
        <h2>All Orders</h2>
        <p>Search, filter, and manage orders</p>
      </div>

      <div className="filter-bar">
        <input
          placeholder="🔍 Customer name"
          value={filters.name}
          onChange={e => setFilters({ ...filters, name: e.target.value })}
        />
        <input
          placeholder="📱 Phone number"
          value={filters.phone}
          onChange={e => setFilters({ ...filters, phone: e.target.value })}
        />
        <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          placeholder="👕 Garment type"
          value={filters.garmentType}
          onChange={e => setFilters({ ...filters, garmentType: e.target.value })}
        />
        <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ status: "", name: "", phone: "", garmentType: "" })}>
          Clear
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--stone)" }}>Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="emoji">🔍</div>
            <h3>No orders found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Garments</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Est. Delivery</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.orderId}>
                    <td><span className="order-id">{o.orderId}</span></td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{o.customerName}</div>
                      <div style={{ fontSize: 12, color: "var(--stone-light)" }}>{o.phone}</div>
                    </td>
                    <td style={{ color: "var(--stone)", maxWidth: 180 }}>
                      {o.garments.map(g => `${g.quantity}×${g.type}`).join(", ")}
                    </td>
                    <td style={{ fontWeight: 600 }}>₹{o.totalAmount}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td style={{ color: "var(--stone)", fontSize: 12 }}>{o.estimatedDelivery}</td>
                    <td style={{ color: "var(--stone-light)", fontSize: 12 }}>{new Date(o.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setStatusModal(o)}>Update</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteOrder(o.orderId)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Modal */}
      {statusModal && (
        <div className="modal-overlay" onClick={() => setStatusModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Update Status</h3>
            <p>Order <strong>{statusModal.orderId}</strong> — {statusModal.customerName}</p>
            <div className="status-flow" style={{ flexDirection: "column", gap: 8 }}>
              {STATUSES.map(s => (
                <button
                  key={s}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "var(--radius-sm)",
                    border: `1.5px solid ${s === statusModal.status ? "var(--accent)" : "var(--border)"}`,
                    background: s === statusModal.status ? "var(--accent-pale)" : "#fff",
                    color: s === statusModal.status ? "var(--accent)" : "var(--charcoal)",
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: 13.5,
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                  onClick={() => updateStatus(statusModal.orderId, s)}
                >
                  {{ RECEIVED: "📥", PROCESSING: "⚙️", READY: "✅", DELIVERED: "🚚" }[s]} {s}
                  {s === statusModal.status && " (current)"}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={() => setStatusModal(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
const PAGES = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "create", label: "New Order", icon: "➕" },
  { id: "orders", label: "All Orders", icon: "🧺" },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>CleanPress</h1>
          <p>Laundry Management</p>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-label">Menu</div>
          {PAGES.map(p => (
            <button
              key={p.id}
              className={`nav-btn${page === p.id ? " active" : ""}`}
              onClick={() => setPage(p.id)}
            >
              <span className="icon">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "0 24px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", lineHeight: 1.6 }}>
            v1.0.0 · JSON Storage<br />
            CleanPress © 2025
          </div>
        </div>
      </aside>

      <main className="main-content">
        {page === "dashboard" && <Dashboard showToast={showToast} />}
        {page === "create" && <CreateOrder showToast={showToast} />}
        {page === "orders" && <OrdersList showToast={showToast} />}
      </main>

      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

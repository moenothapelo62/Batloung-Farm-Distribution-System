import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useFarm } from "../utils/FarmContext";
import { money, vendorName, supplierName, FRUIT_IMAGES, DEFAULT_PRODUCE_IMAGE, SIZES } from "../utils/store";
import { CountUp, SpotlightCard, FadeIn, TiltCard, GradientText } from "../components/Bits";

function DashboardMetricIcon({ name }) {
  const iconProps = {
    viewBox: "0 0 32 32",
    width: "20",
    height: "20",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (name === "revenue") {
    return <svg {...iconProps}><circle cx="16" cy="16" r="11" /><path d="M20 11.5c-.8-1-2-1.5-4-1.5-2.2 0-3.5 1-3.5 2.4s1.2 2.1 3.5 2.5 3.5 1.1 3.5 2.6-1.4 2.5-3.5 2.5c-1.6 0-2.9-.5-3.8-1.5M16 7v18" /></svg>;
  }
  if (name === "collections") {
    return <svg {...iconProps}><rect x="7" y="5" width="18" height="22" rx="3" /><path d="m11 15 3 3 7-8M11 23h10" /></svg>;
  }
  if (name === "outstanding") {
    return <svg {...iconProps}><circle cx="15" cy="17" r="10" /><path d="M15 11v6l4 2M22 6h6v6M25 5v4" /></svg>;
  }
  return <svg {...iconProps}><path d="m4 10 12-6 12 6v14l-12 6-12-6V10Z" /><path d="m4 10 12 6 12-6M16 16v14M10 7l12 6" /></svg>;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { data, stats, loading } = useFarm();

  const collectionRate = stats.salesTotal ? Math.round((stats.received / stats.salesTotal) * 100) : 0;
  const outstandingRate = stats.salesTotal ? Math.max(0, 100 - collectionRate) : 0;
  const netPosition = stats.salesTotal - stats.purchaseTotal;

  const kpis = [
    { label: "Total Revenue", raw: stats.salesTotal, prefix: "M ", meta: `${data.sales.length} sales recorded`, tone: "green", icon: "revenue" },
    { label: "Collections", raw: stats.received, prefix: "M ", meta: `${collectionRate}% collected`, tone: "cyan", icon: "collections" },
    { label: "Outstanding", raw: stats.outstanding, prefix: "M ", meta: `${data.vendors.length} vendors`, tone: "gold", icon: "outstanding" },
    { label: "Stock on Hand", raw: stats.stockQty, prefix: "", suffix: " boxes", meta: `${stats.lowStock.length} low-stock alerts`, tone: "orange", icon: "stock" },
  ];

  const stockByFruit = useMemo(() => data.fruits.map((f) => {
    const sizes = SIZES.map((sz) => Number(data.stock.find((s) => String(s.fruitId) === String(f.id) && s.packagingSize === sz)?.quantity || 0));
    const total = sizes.reduce((a, b) => a + b, 0);
    return { fruit: f, sizes, total };
  }), [data.fruits, data.stock]);
  const maxStock = Math.max(1, ...stockByFruit.map((s) => s.total));

  const topFruitSales = useMemo(() => {
    const quantities = new Map();
    for (const sale of data.sales) {
      for (const item of sale.items) {
        const name = item.fruitName || data.fruits.find((fruit) => String(fruit.id) === String(item.fruitId))?.name || "Unknown";
        quantities.set(name, (quantities.get(name) || 0) + Number(item.quantity || 0));
      }
    }
    return [...quantities.entries()]
      .map(([name, boxes]) => ({ name, boxes }))
      .sort((a, b) => b.boxes - a.boxes || a.name.localeCompare(b.name))
      .slice(0, 5);
  }, [data.sales, data.fruits]);
  const dailyRevenue = useMemo(() => {
    const totals = new Map();
    for (const sale of data.sales) totals.set(sale.date, (totals.get(sale.date) || 0) + Number(sale.totalAmount || 0));
    return [...totals.entries()]
      .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
      .slice(-7)
      .map(([date, total]) => ({ date, total }));
  }, [data.sales]);
  const maxFruitSales = Math.max(1, ...topFruitSales.map((item) => item.boxes));
  const maxDailyRevenue = Math.max(1, ...dailyRevenue.map((item) => item.total));

  const recent = useMemo(() => {
    const seen = new Set();
    return [
      ...data.sales.slice(0, 6).map((s) => ({
        id: `s-${s.id}`, type: "Sale", date: s.date, status: s.paymentStatus,
        party: s.vendorName || vendorName(data, s.vendorId),
        amount: money(s.totalAmount),
        detail: `${s.items.reduce((a, i) => a + Number(i.quantity || 0), 0)} boxes · ${s.paymentMethod}`,
      })),
      ...data.purchases.slice(0, 4).map((p) => ({
        id: `p-${p.id}`, type: "Purchase", date: p.date, status: "Recorded",
        party: p.supplierName || supplierName(data, p.supplierId),
        amount: money(p.totalAmount),
        detail: `${p.items.reduce((a, i) => a + Number(i.quantity || 0), 0)} boxes`,
      })),
    ].filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 8);
  }, [data]);

  const lowStock = useMemo(() => data.stock
    .filter((s) => Number(s.quantity) <= 10)
    .map((s) => ({ ...s, fruit: s.name || data.fruits.find((f) => String(f.id) === String(s.fruitId))?.name || "Unknown" }))
    .sort((a, b) => Number(a.quantity) - Number(b.quantity)), [data.stock, data.fruits]);

  // Group low-stock rows by fruit so the fruit name appears once (no repetition)
  const lowStockGroups = useMemo(() => {
    const map = new Map();
    for (const s of lowStock) {
      if (!map.has(s.fruit)) map.set(s.fruit, []);
      map.get(s.fruit).push(s);
    }
    return [...map.entries()].map(([fruit, items]) => ({
      fruit,
      fruitId: items[0].fruitId,
      items: [...items].sort((a, b) => SIZES.indexOf(a.packagingSize) - SIZES.indexOf(b.packagingSize)),
      min: Math.min(...items.map((i) => Number(i.quantity))),
    })).slice(0, 6);
  }, [lowStock]);

  const summaryCards = [
    { label: "Suppliers", value: data.suppliers.length, hint: "Active supply partners", to: "/suppliers" },
    { label: "Fruits", value: data.fruits.length, hint: "Registered produce types", to: "/fruits" },
    { label: "Vendors", value: data.vendors.length, hint: "Retail customers", to: "/vendors" },
    { label: "Purchases", value: data.purchases.length, hint: money(stats.purchaseTotal), to: "/purchases" },
  ];

  return (
    <div className="container section page dashboard-pro">
      <FadeIn>
        <SpotlightCard className="panel glass-panel exec-header exec-hero">
          <div className="exec-header-main">
            <div className="banner-title-row" style={{ marginBottom: 8 }}>
              <img className="page-icon" src="/batloung-logo.svg" alt="" />
              <div>
                <p className="eyebrow">BATLOUNG FARM · MASERU, LESOTHO</p>
                <h1><GradientText>Batloung Farm Distribution System</GradientText></h1>
                <p className="hero-greeting">{greeting()}, here's how distribution is running today.</p>
              </div>
            </div>
            <div className="exec-actions">
              <Link to="/sales" className="btn primary">+ New Sale</Link>
              <Link to="/purchases" className="btn ghost">+ New Purchase</Link>
              <Link to="/reports" className="btn ghost">View Reports</Link>
            </div>
          </div>
          <div className="exec-hero-visual">
            <img src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1000&q=85" alt="Fresh produce ready for market" />
          </div>
        </SpotlightCard>
      </FadeIn>

      <div className="kpi-pro-grid">
        {kpis.map((k, i) => (
          <FadeIn key={k.label} delay={40 + i * 45}>
            <TiltCard className={`panel glass-panel kpi-pro tone-border-${k.tone}`} max={4}>
              <div className="kpi-pro-top">
                <span className={`kpi-icon tone-${k.tone}`}><DashboardMetricIcon name={k.icon} /></span>
                <span className="kpi-pro-label">{k.label}</span>
              </div>
              <div className="kpi-pro-value"><CountUp value={k.raw || 0} prefix={k.prefix || ""} suffix={k.suffix || ""} /></div>
              <div className="kpi-pro-meta">{k.meta}</div>
            </TiltCard>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={80}>
        <div className="summary-strip">
          {summaryCards.map((c) => (
            <Link key={c.label} to={c.to} className="summary-chip glass-panel">
              <span className="summary-chip-value">{c.value}</span>
              <span className="summary-chip-label">{c.label}</span>
              <span className="summary-chip-hint">{c.hint}</span>
            </Link>
          ))}
        </div>
      </FadeIn>

      <div className="dash-grid">
        <FadeIn delay={100}>
          <SpotlightCard className="panel glass-panel">
            <div className="panel-head">
              <div><span className="eyebrow">Sales Mix</span><h3>Top Fruits by Boxes Sold</h3></div>
              <Link to="/reports" className="btn sm ghost">Full Report</Link>
            </div>
            {loading ? <div className="empty">Loading sales mix...</div> : topFruitSales.length === 0 ? (
              <div className="empty">No sales data yet. Fruit sales will appear here after the first order.</div>
            ) : (
              <div className="fruit-sales-list">
                {topFruitSales.map((item) => (
                  <div className="fruit-sales-row" key={item.name}>
                    <img src={FRUIT_IMAGES[item.name] || DEFAULT_PRODUCE_IMAGE} alt="" />
                    <strong>{item.name}</strong>
                    <div className="fruit-sales-track"><span style={{ width: `${(item.boxes / maxFruitSales) * 100}%` }} /></div>
                    <span className="mono">{item.boxes} boxes</span>
                  </div>
                ))}
              </div>
            )}
          </SpotlightCard>
        </FadeIn>
        <FadeIn delay={140}>
          <SpotlightCard className="panel glass-panel">
            <div className="panel-head">
              <div><span className="eyebrow">Revenue Trend</span><h3>Daily Sales Revenue</h3></div>
              <Link to="/reports" className="btn sm ghost">Date Range</Link>
            </div>
            {loading ? <div className="empty">Loading revenue trend...</div> : dailyRevenue.length === 0 ? (
              <div className="empty">No revenue trend yet. Completed sales will be charted here.</div>
            ) : (
              <div className="daily-revenue-chart" aria-label="Daily sales revenue for the latest recorded sale dates">
                {dailyRevenue.map(({ date, total }, index) => {
                  const previous = dailyRevenue[index - 1];
                  const difference = previous ? total - previous.total : null;
                  const comparison = previous
                    ? `${difference >= 0 ? "Up" : "Down"} ${money(Math.abs(difference))} from the previous date shown`
                    : "First date shown";
                  return (
                    <div
                      className="daily-revenue-column"
                      key={date}
                      tabIndex={0}
                      title={`${date}: ${money(total)}. ${comparison}.`}
                      aria-label={`${date}, revenue ${money(total)}. ${comparison}.`}
                    >
                      <span className="daily-revenue-value">{money(total)}</span>
                      <span className="daily-revenue-tooltip" aria-hidden="true">{money(total)} · {comparison}</span>
                      <div className="daily-revenue-track"><span style={{ height: `${Math.max(8, (total / maxDailyRevenue) * 100)}%` }} /></div>
                      <span className="daily-revenue-date">{new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </SpotlightCard>
        </FadeIn>
      </div>

      <div className="dash-grid">
        <FadeIn delay={120}>
          <SpotlightCard className="panel glass-panel">
            <div className="panel-head">
              <div><span className="eyebrow">Financial Performance</span><h3>Revenue, Collections & Exposure</h3></div>
              <Link to="/payments" className="btn sm ghost">Payments</Link>
            </div>
            <div className="finance-summary">
              <div className="finance-row"><span>Total billed sales</span><strong className="mono">{money(stats.salesTotal)}</strong></div>
              <div className="finance-row"><span>Amount received</span><strong className="mono ok-text">{money(stats.received)}</strong></div>
              <div className="finance-row"><span>Outstanding balance</span><strong className="mono warn-text">{money(stats.outstanding)}</strong></div>
              <div className="finance-row"><span>Procurement spend</span><strong className="mono">{money(stats.purchaseTotal)}</strong></div>
              <div className="finance-row"><span>Net position (sales - purchases)</span><strong className={`mono ${netPosition >= 0 ? "ok-text" : "warn-text"}`}>{money(netPosition)}</strong></div>
            </div>
            <div className="collection-meter">
              <div className="meter-top"><span>Collection rate</span><span className="mono">{collectionRate}%</span></div>
              <div className="meter-track"><div className="meter-fill" style={{ width: `${Math.max(3, collectionRate)}%`, background: "linear-gradient(90deg,#3ddc97,#5de4ff)" }} /></div>
            </div>
            <div className="collection-meter">
              <div className="meter-top"><span>Outstanding exposure</span><span className="mono">{outstandingRate}%</span></div>
              <div className="meter-track"><div className="meter-fill" style={{ width: `${Math.max(2, outstandingRate)}%`, background: "linear-gradient(90deg,#ff9f43,#ffd166)" }} /></div>
            </div>
          </SpotlightCard>
        </FadeIn>

        <FadeIn delay={160}>
          <SpotlightCard className="panel glass-panel">
            <div className="panel-head">
              <div><span className="eyebrow">Inventory Health</span><h3>Low Stock Alerts (≤10 boxes)</h3></div>
              <Link to="/stock" className="btn sm ghost">Manage Stock</Link>
            </div>
            {loading ? <div className="empty">Loading inventory...</div> : lowStockGroups.length === 0 ? (
              <div className="empty">No low-stock items. Inventory levels are stable across all packaging sizes.</div>
            ) : (
              <div className="alert-list">
                {lowStockGroups.map((g) => (
                  <div key={g.fruitId} className="alert-row">
                    <div className="alert-row-main">
                      <img src={FRUIT_IMAGES[g.fruit] || DEFAULT_PRODUCE_IMAGE} alt="" className="mini-thumb" />
                      <div>
                        <strong>{g.fruit}</strong>
                        <div className="low-sizes">
                          {g.items.map((i) => (
                            <span key={i.packagingSize} className="low-size-chip">{i.packagingSize} · {i.quantity}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className={`pill ${g.min <= 5 ? "danger" : "warn"}`}>
                      {g.min} boxes left{g.items.length > 1 ? " (lowest)" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SpotlightCard>
        </FadeIn>
      </div>

      <div className="dash-grid">
        <FadeIn delay={180}>
          <SpotlightCard className="panel glass-panel">
            <div className="panel-head">
              <div><span className="eyebrow">Inventory Distribution</span><h3>Stock by Fruit & Packaging Size</h3></div>
              <Link to="/stock" className="btn sm ghost">Stock Details</Link>
            </div>
            {loading ? <div className="empty">Loading stock distribution...</div> : (
              <div className="distribution-list">
                {stockByFruit.map(({ fruit, sizes, total }) => (
                  <div key={fruit.id} className="distribution-row">
                    <div className="distribution-head">
                      <div className="row" style={{ gap: 10 }}>
                        <img src={FRUIT_IMAGES[fruit.name] || DEFAULT_PRODUCE_IMAGE} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover" }} />
                        <strong>{fruit.name}</strong>
                      </div>
                      <span className="mono">{total} boxes</span>
                    </div>
                    <div className="meter-track"><div className="meter-fill" style={{ width: `${Math.max(4, (total / maxStock) * 100)}%`, background: "linear-gradient(90deg,#3ddc97,#5de4ff,#ff9f43)" }} /></div>
                    <div className="sub">Small {sizes[0]} · Medium {sizes[1]} · Large {sizes[2]}</div>
                  </div>
                ))}
              </div>
            )}
          </SpotlightCard>
        </FadeIn>

        <FadeIn delay={220}>
          <SpotlightCard className="panel glass-panel">
            <div className="panel-head">
              <div><span className="eyebrow">Activity Log</span><h3>Recent Transactions</h3></div>
              <Link to="/reports" className="btn sm ghost">All Reports</Link>
            </div>
            <div className="table-wrap glass-table">
              <table style={{ minWidth: 0 }}>
                <thead><tr><th>Type</th><th>Date</th><th>Party</th><th>Detail</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan="6" className="empty">Loading transactions...</td></tr> : recent.length === 0 ? <tr><td colSpan="6" className="empty">No transactions recorded yet.</td></tr> : recent.map((r) => (
                    <tr key={r.id}>
                      <td><span className={`pill ${r.type === "Sale" ? "info" : "ok"}`}>{r.type}</span></td>
                      <td className="mono">{r.date}</td>
                      <td><strong>{r.party}</strong></td>
                      <td>{r.detail}</td>
                      <td className="mono"><strong>{r.amount}</strong></td>
                      <td><span className={`pill ${r.status === "PAID" || r.status === "Recorded" ? "ok" : r.status === "PARTIALLY_PAID" ? "warn" : "danger"}`}>{String(r.status).replace("_"," ")}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SpotlightCard>
        </FadeIn>
      </div>
    </div>
  );
}

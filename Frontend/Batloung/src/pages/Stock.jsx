import { useMemo, useState } from "react";
import { useFarm } from "../utils/FarmContext";
import { SIZES, FRUIT_IMAGES, DEFAULT_PRODUCE_IMAGE } from "../utils/store";
import { FadeIn, SpotlightCard, FilterChips, TiltCard, GradientText } from "../components/Bits";

const PAGE_ICON = "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=120&q=70";

export default function Stock() {
  const { data, loading, error: loadError, refresh } = useFarm();
  const [filter, setFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [q, setQ] = useState("");

  const rows = useMemo(() => data.stock.map((s) => ({
    ...s,
    name: s.name || data.fruits.find((f) => String(f.id) === String(s.fruitId))?.name || "Unknown",
    low: Number(s.quantity) <= 10,
  })), [data]);

  const list = rows.filter((r) =>
    (filter === "low" ? r.low : true) &&
    (sizeFilter === "all" ? true : r.packagingSize === sizeFilter) &&
    r.name.toLowerCase().includes(q.toLowerCase())
  );

  // Group rows by fruit so the name is rendered once per group (no repeated values)
  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of list) {
      const key = r.name;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return [...map.entries()];
  }, [list]);

  const byFruit = data.fruits.map((f) => ({
    fruit: f,
    sizes: SIZES.map((sz) => ({ size: sz, qty: Number(data.stock.find((s) => String(s.fruitId) === String(f.id) && s.packagingSize === sz)?.quantity || 0) })),
    total: data.stock.filter((s) => String(s.fruitId) === String(f.id)).reduce((a, s) => a + Number(s.quantity || 0), 0),
  })).filter(({ fruit }) => !q || fruit.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="container section page">
      <div className="page-banner glass-hero" style={{ backgroundImage: "linear-gradient(135deg,rgba(7,19,17,.68),rgba(28,143,99,.3)),url(https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&w=1800&q=80)", backgroundPosition:"center" }}>
        <div>
          <div className="banner-title-row">
            <img className="page-icon" src={PAGE_ICON} alt="" />
            <h1><GradientText>Stock Management</GradientText></h1>
          </div>
          <p>See how many boxes of each fruit are available. Purchases add to stock, and sales reduce it.</p>
        </div>
        <button className="btn ghost" onClick={() => refresh(true)} disabled={loading}>Refresh</button>
      </div>

      {loadError && <div className="alert error">We couldn't load the data. {loadError}</div>}

      <FadeIn delay={40}>
        <SpotlightCard className="panel glass-panel">
          <div className="panel-head" style={{flexWrap:"wrap", gap:12}}>
            <h3>Stock by Fruit & Packaging Size</h3>
            <div className="toolbar"><input className="glass-input" placeholder="Search fruit..." value={q} onChange={(e)=>setQ(e.target.value)} /></div>
          </div>
          <div style={{display:"flex", flexWrap:"wrap", gap:16, marginBottom:10}}>
            <div><div className="sub" style={{marginBottom:6}}>Level</div><FilterChips options={[{value:"all",label:"All levels"},{value:"low",label:"Low stock (=10)"}]} value={filter} onChange={setFilter} /></div>
            <div><div className="sub" style={{marginBottom:6}}>Packaging</div><FilterChips options={[{value:"all",label:"All sizes"},...SIZES.map(s=>({value:s,label:s}))]} value={sizeFilter} onChange={setSizeFilter} /></div>
          </div>
          <div className="stock-visual-grid">
            {loading ? <div className="empty">Loading stock...</div> : byFruit.length === 0 ? <div className="empty">No stock yet. Record a purchase and stock levels will appear here.</div> : byFruit.map(({ fruit, sizes, total }) => (
              <TiltCard className="stock-visual-card stock-photo-card glass-card" key={fruit.id} max={5}>
                <div className="stock-photo"><img src={FRUIT_IMAGES[fruit.name] || DEFAULT_PRODUCE_IMAGE} alt={fruit.name} loading="lazy" /></div>
                <div className="stock-info">
                  <div className="row"><strong>{fruit.name}</strong><span className="sub">Total {total} boxes</span></div>
                  <div className="size-grid">
                    {sizes.map(({ size, qty }) => (
                      <div key={size} className="size-tile">
                        <span className="size-label">{size}</span>
                        <span className="size-value">{qty}</span>
                        <span className={`pill ${qty <= 10 ? "warn" : "ok"}`}>{qty <= 10 ? "Low" : "OK"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </SpotlightCard>
      </FadeIn>

      <FadeIn delay={100}>
        <SpotlightCard className="panel glass-panel">
          <div className="panel-head"><h3>Stock Records ({list.length})</h3></div>
          <div className="table-wrap glass-table">
            <table>
              <thead><tr><th>Fruit</th><th>Packaging Size</th><th>Available Quantity</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="4" className="empty">Loading stock records...</td></tr> : list.length === 0 ? <tr><td colSpan="4" className="empty">No stock records yet. Stock appears as soon as you record a purchase.</td></tr> : grouped.map(([name, group]) => (
                  group.map((r, i) => (
                    <tr key={r.id}>
                      {i === 0 && <td className="group-cell" rowSpan={group.length}><strong>{name}</strong></td>}
                      <td style={{textTransform:"capitalize"}}>{r.packagingSize}</td>
                      <td className="mono">{r.quantity} boxes</td>
                      <td><span className={`pill ${r.low ? "warn" : "ok"}`}>{r.low ? "Low stock" : "In stock"}</span></td>
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        </SpotlightCard>
      </FadeIn>
    </div>
  );
}

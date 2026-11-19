import { useEffect, useMemo, useState } from "react";
import { useFarm } from "../utils/FarmContext";
import { reportsApi, getErrorMessage } from "../services/api";
import { money, fruitName, vendorName, FRUIT_IMAGES, DEFAULT_PRODUCE_IMAGE } from "../utils/store";
import { FadeIn, SpotlightCard, GradientText } from "../components/Bits";

const COLORS = ["#287d53", "#4d9469", "#82b381", "#d6a64f", "#ca6b50"];

function BarChart({ data, max, valueLabel, emptyMessage = "No sales have been recorded yet." }) {
  return (
    <div className="chart-bars">
      {data.map((d, i) => {
        const pct = max ? (d.value / max) * 100 : 0;
        const difference = max - d.value;
        const value = valueLabel ? valueLabel(d.value) : d.value;
        const comparison = d.comparison || (difference === 0
          ? "Highest value"
          : `${valueLabel ? valueLabel(difference) : difference} below the highest`);
        return (
          <div
            key={d.label}
            className="chart-bar-row"
            tabIndex={0}
            aria-label={`${d.label}: ${value}. ${comparison}.`}
          >
            <div className="chart-bar-label">
              <span className="chart-bar-identity">{d.image && <img src={d.image} alt="" />}<span>{d.label}</span></span>
              <span className="mono">{value}</span>
            </div>
            <div className="chart-bar-track"><div className="chart-bar-fill" style={{ width: `${Math.max(4, pct)}%`, background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i+2) % COLORS.length]})` }} /></div>
            <span className="chart-bar-hover-detail" aria-hidden="true">{comparison}</span>
          </div>
        );
      })}
      {data.length === 0 && <div className="empty">{emptyMessage}</div>}
    </div>
  );
}

function PieChart({ data, centerLabel = "boxes" }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const values = data.map((item) => Math.max(0, Number(item.value) || 0));
  const total = values.reduce((sum, value) => sum + value, 0);
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  const segments = values.map((value, index) => {
    if (!value || !total) return null;
    const length = (value / total) * circumference;
    const offset = values.slice(0, index).reduce((sum, priorValue) => sum + (priorValue / total) * circumference, 0);
    return { index, length, offset };
  }).filter(Boolean);
  const activeValue = activeIndex === null ? null : values[activeIndex];
  const activeShare = activeValue === null || !total ? null : Math.round((activeValue / total) * 100);

  return (
    <div className="pie-wrap">
      <div className="pie">
        <svg className="pie-chart" viewBox="0 0 220 220" role="group" aria-label="Fruit sales share chart">
          <circle className="pie-track" cx="110" cy="110" r={radius} />
          {segments.map((segment) => {
            const index = segment.index;
            const share = Math.round((values[index] / total) * 100);
            return (
              <circle
                key={data[index].label}
                className={`pie-segment${activeIndex === index ? " active" : ""}${activeIndex !== null && activeIndex !== index ? " dimmed" : ""}`}
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={activeIndex === index ? 40 : 34}
                strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                strokeDashoffset={-segment.offset}
                transform="rotate(-90 110 110)"
                tabIndex="0"
                role="img"
                focusable="true"
                aria-label={`${data[index].label}: ${values[index]} ${centerLabel}, ${share}% of total`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
              />
            );
          })}
        </svg>
        <div className="pie-center" aria-hidden="true">
          <div className="pie-total">{activeValue === null ? total : `${activeShare}%`}</div>
          <div className="sub">{activeIndex === null ? centerLabel : data[activeIndex].label}</div>
          {activeValue !== null && <div className="pie-active-value">{activeValue} {centerLabel}</div>}
        </div>
      </div>
      <div className="pie-legend">
        {data.map((d, i) => (
          <button
            key={d.label}
            type="button"
            className={`legend-row${activeIndex === i ? " active" : ""}`}
            aria-pressed={activeIndex === i}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            onFocus={() => setActiveIndex(i)}
            onBlur={() => setActiveIndex(null)}
          >
            <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
            <span>{d.label}</span>
            <b className="mono">{values[i]}</b>
            <small>{total ? `${Math.round((values[i] / total) * 100)}%` : "0%"}</small>
          </button>
        ))}
        {data.length === 0 && <div className="empty">No data yet.</div>}
      </div>
    </div>
  );
}

export default function Reports() {
  const { data, stats, loading, error: loadError, refresh } = useFarm();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [revenue, setRevenue] = useState(null);
  const [revenueErr, setRevenueErr] = useState("");
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [topFruitsApi, setTopFruitsApi] = useState([]);
  const [topVendorApi, setTopVendorApi] = useState(null);
  const [stockLevels, setStockLevels] = useState([]);
  const [reportErr, setReportErr] = useState("");

  useEffect(() => {
    let active = true;
    const loadReports = async () => {
      try {
        const [tf, tv, sl] = await Promise.all([
          reportsApi.topFruits(),
          reportsApi.topVendor(),
          reportsApi.stockLevels(),
        ]);
        if (!active) return;
        setTopFruitsApi(Array.isArray(tf) ? tf : []);
        setTopVendorApi(tv);
        setStockLevels(Array.isArray(sl) ? sl : []);
        setReportErr("");
      } catch (e) { if (active) setReportErr(getErrorMessage(e)); }
    };
    void loadReports();
    return () => { active = false; };
  }, [data.sales, data.stock, data.purchases, data.fruits]);

  const applyDatePreset = (preset) => {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    let start = new Date(end.getFullYear(), end.getMonth(), 1);
    let rangeEnd = end;
    if (preset === "previous-month") {
      start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      rangeEnd = new Date(end.getFullYear(), end.getMonth(), 0);
    } else if (preset === "year-to-date") {
      start = new Date(end.getFullYear(), 0, 1);
    }
    const toInputDate = (value) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
    setFrom(toInputDate(start));
    setTo(toInputDate(rangeEnd));
    setRevenue(null);
    setRevenueErr("");
  };

  const refreshReports = async () => {
    try {
      const [tf, tv, sl] = await Promise.all([
        reportsApi.topFruits(),
        reportsApi.topVendor(),
        reportsApi.stockLevels(),
      ]);
      setTopFruitsApi(Array.isArray(tf) ? tf : []);
      setTopVendorApi(tv);
      setStockLevels(Array.isArray(sl) ? sl : []);
      setReportErr("");
    } catch (e) { setReportErr(getErrorMessage(e)); }
  };

  const runRevenue = async (e) => {
    e?.preventDefault?.();
    setRevenueErr(""); setRevenue(null);
    if (!from || !to) { setRevenueErr("Select both start and end dates."); return; }
    if (from > to) { setRevenueErr("Start date must be on or before end date."); return; }
    setRevenueLoading(true);
    try {
      const res = await reportsApi.revenue(from, to);
      setRevenue(res);
    } catch (e) { setRevenueErr(getErrorMessage(e)); }
    finally { setRevenueLoading(false); }
  };

  const freqFromApi = (topFruitsApi || []).map((r) => ({
    label: r.fruit_name,
    value: Number(r.total_boxes_sold || 0),
    image: FRUIT_IMAGES[r.fruit_name] || DEFAULT_PRODUCE_IMAGE,
  }));
  const freqFallback = useMemo(() => {
    const map = {};
    data.sales.forEach((s) => s.items.forEach((it) => {
      const n = it.fruitName || fruitName(data, it.fruitId);
      map[n] = (map[n] || 0) + Number(it.quantity || 0);
    }));
    return Object.entries(map).map(([label, value]) => ({
      label,
      value,
      image: FRUIT_IMAGES[label] || DEFAULT_PRODUCE_IMAGE,
    })).sort((a,b)=>b.value-a.value).slice(0,5);
  }, [data]);
  const freq = freqFromApi.length ? freqFromApi : freqFallback;

  const vendorBoxes = useMemo(() => {
    const map = {};
    data.sales.forEach((s) => s.items.forEach((it) => {
      const id = s.vendorId;
      if (!map[id]) map[id] = { label: s.vendorName || vendorName(data, id), value: 0 };
      map[id].value += Number(it.quantity || 0);
    }));
    return Object.values(map).sort((a,b)=>b.value-a.value);
  }, [data]);

  const topVendor = (topVendorApi && (topVendorApi.vendor_name || topVendorApi.vendor_id)) ? {
    label: topVendorApi.vendor_name,
    value: Number(topVendorApi.total_boxes_purchased || 0),
    phone: topVendorApi.phone_number,
  } : vendorBoxes[0] || null;

  const paymentMix = useMemo(() => {
    const counts = { PAID: 0, PARTIALLY_PAID: 0, UNPAID: 0 };
    data.sales.forEach((s) => { counts[s.paymentStatus] = (counts[s.paymentStatus] || 0) + 1; });
    return Object.entries(counts).map(([label, value]) => ({ label: label.replace("_", " "), value })).filter(d => d.value > 0);
  }, [data.sales]);

  const stockRows = stockLevels.length ? (() => {
    const byFruit = {};
    stockLevels.forEach((r) => {
      if (!byFruit[r.fruit_name]) byFruit[r.fruit_name] = { name: r.fruit_name, small: 0, medium: 0, large: 0 };
      byFruit[r.fruit_name][r.packaging_size] = Number(r.available_quantity || 0);
    });
    return Object.values(byFruit);
  })() : data.fruits.map((f) => ({
    name: f.name,
    small: Number(data.stock.find(s=>String(s.fruitId)===String(f.id) && s.packagingSize==="small")?.quantity || 0),
    medium: Number(data.stock.find(s=>String(s.fruitId)===String(f.id) && s.packagingSize==="medium")?.quantity || 0),
    large: Number(data.stock.find(s=>String(s.fruitId)===String(f.id) && s.packagingSize==="large")?.quantity || 0),
  }));

  const maxFreq = Math.max(1, ...freq.map(f=>f.value));
  const maxVend = Math.max(1, ...vendorBoxes.map(v=>v.value));
  const maxPaymentCount = Math.max(1, ...paymentMix.map((item) => item.value));
  const boxesSold = data.sales.reduce((total, sale) => total + sale.items.reduce((saleTotal, item) => saleTotal + Number(item.quantity || 0), 0), 0);
  const reportSummary = [
    { label: "Sales revenue", value: money(stats.salesTotal), note: `${data.sales.length} recorded sales`, tone: "green" },
    { label: "Boxes sold", value: boxesSold.toLocaleString(), note: "Across all packaging sizes", tone: "cyan" },
    { label: "Outstanding", value: money(stats.outstanding), note: "Open vendor balances", tone: "gold" },
    { label: "Top-selling fruit", value: freq[0]?.label || "—", note: freq[0] ? `${freq[0].value} boxes sold` : "No sales recorded yet", tone: "orange" },
  ];
  const monthCount = revenue?.start && revenue?.end
    ? (Number(String(revenue.end).slice(0, 4)) - Number(String(revenue.start).slice(0, 4))) * 12
      + Number(String(revenue.end).slice(5, 7)) - Number(String(revenue.start).slice(5, 7)) + 1
    : 0;
  const monthlyRangeTooLong = monthCount > 120;
  const monthlyRevenue = useMemo(() => {
    if (!revenue?.start || !revenue?.end || monthlyRangeTooLong || monthCount < 1) return [];
    const start = String(revenue.start).slice(0, 10);
    const end = String(revenue.end).slice(0, 10);
    const totals = new Map();
    const startMonth = Number(start.slice(0, 4)) * 12 + Number(start.slice(5, 7)) - 1;
    for (let offset = 0; offset < monthCount; offset++) {
      const monthIndex = startMonth + offset;
      const year = Math.floor(monthIndex / 12);
      const month = monthIndex % 12 + 1;
      totals.set(`${year}-${String(month).padStart(2, "0")}`, 0);
    }
    data.sales.forEach((sale) => {
      const date = String(sale.date).slice(0, 10);
      if (date < start || date > end) return;
      const month = date.slice(0, 7);
      totals.set(month, (totals.get(month) || 0) + Number(sale.totalAmount || 0));
    });
    const months = [...totals.entries()].sort(([a], [b]) => a.localeCompare(b));
    return months.map(([month, value], index) => {
      const previous = months[index - 1]?.[1];
      const difference = previous === undefined ? null : value - previous;
      return {
        label: new Date(`${month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
        value,
        comparison: difference === null
          ? "First month in this date range"
          : `${difference >= 0 ? "Up" : "Down"} ${money(Math.abs(difference))} from the previous month`,
      };
    });
  }, [data.sales, monthCount, monthlyRangeTooLong, revenue]);

  return (
    <div className="container section page reports-page">
      <div className="page-banner glass-hero reports-hero" style={{ backgroundImage: "linear-gradient(115deg,rgba(13,42,30,.88),rgba(32,112,73,.74)),url(https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1800&q=80)", backgroundPosition:"center" }}>
        <div>
          <div className="banner-title-row">
            <img className="page-icon" src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=120&q=70" alt="" />
            <div>
              <p className="report-kicker">BATLOUNG FARM · PERFORMANCE</p>
              <h1><GradientText>Farm Performance</GradientText></h1>
            </div>
          </div>
          <p>See sales, vendor activity, payments, and stock in one place.</p>
        </div>
        <button className="btn ghost" type="button" onClick={() => { refresh(true); void refreshReports(); }} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh reports"}
        </button>
      </div>

      {(loadError || reportErr) && <div className="alert error">{loadError ? `We couldn't load the data. ${loadError}` : reportErr}</div>}

      <div className="report-summary-grid">
        {reportSummary.map((item, index) => (
          <FadeIn key={item.label} delay={30 + index * 35}>
            <SpotlightCard className={`panel glass-panel report-summary-card tone-border-${item.tone}`}>
              <span className="report-summary-label">{item.label}</span>
              <strong className="report-summary-value">{item.value}</strong>
              <span className="report-summary-note">{item.note}</span>
            </SpotlightCard>
          </FadeIn>
        ))}
      </div>

      <FadeIn delay={40}>
        <SpotlightCard className="panel glass-panel report-revenue-panel">
          <div className="panel-head">
            <div><span className="eyebrow">Revenue analysis</span><h3>Revenue by date range</h3></div>
            <span className="report-context">Choose a period to review billed sales</span>
          </div>
          <form className="toolbar report-date-form" onSubmit={runRevenue}>
            <div className="report-date-presets" aria-label="Choose a date range">
              <button className="btn sm ghost" type="button" onClick={() => applyDatePreset("this-month")}>This month</button>
              <button className="btn sm ghost" type="button" onClick={() => applyDatePreset("previous-month")}>Last month</button>
              <button className="btn sm ghost" type="button" onClick={() => applyDatePreset("year-to-date")}>Year to date</button>
            </div>
            <label className="sub">From <input className="glass-input" type="date" value={from} onChange={(e)=>setFrom(e.target.value)} required /></label>
            <label className="sub">To <input className="glass-input" type="date" value={to} onChange={(e)=>setTo(e.target.value)} required /></label>
            <div className="report-date-actions">
              <button className="btn primary" type="submit" disabled={revenueLoading}>{revenueLoading ? "Calculating..." : "Run report"}</button>
              <button className="btn ghost" type="button" onClick={()=>{setFrom("");setTo("");setRevenue(null);setRevenueErr("");}}>Clear dates</button>
            </div>
          </form>
          {revenueErr && <div className="alert error">{revenueErr}</div>}
          <div className="report-range-result">
            <div>
              <span className="report-summary-label">Revenue in selected period</span>
              <strong className="report-range-value">{revenue ? money(revenue.total_revenue) : "—"}</strong>
              <span className="report-summary-note">{revenue ? `${revenue.sales_count} sales · ${revenue.start} to ${revenue.end}` : "Select dates and run the report to see results."}</span>
            </div>
            <div className="report-range-side">
              <span className="report-summary-label">All-time revenue</span>
              <strong>{money(stats.salesTotal)}</strong>
              <span className="report-summary-note">{data.sales.length} sales</span>
            </div>
          </div>
          {revenue && (
            <div className="monthly-revenue-breakdown">
              <div className="monthly-revenue-heading">
                <strong>Revenue by month</strong>
                <span>Hover over a bar to compare it with the previous month.</span>
              </div>
              <BarChart
                data={monthlyRevenue}
                max={Math.max(1, ...monthlyRevenue.map((item) => item.value))}
                valueLabel={money}
                emptyMessage={monthlyRangeTooLong
                  ? "Choose a date range of 10 years or less to see the monthly breakdown."
                  : "No sales were recorded in this date range."}
              />
            </div>
          )}
        </SpotlightCard>
      </FadeIn>

      <div className="split">
        <FadeIn delay={80}>
          <SpotlightCard className="panel glass-panel report-panel">
            <div className="panel-head">
              <div><span className="eyebrow">Product performance</span><h3>Top-selling fruits</h3></div>
              <span className="report-context">By boxes sold</span>
            </div>
            <BarChart data={freq} max={maxFreq} valueLabel={(v)=>`${v} boxes`} emptyMessage="Fruit sales will appear here when orders are recorded." />
          </SpotlightCard>
        </FadeIn>
        <FadeIn delay={120}>
          <SpotlightCard className="panel glass-panel report-panel">
            <div className="panel-head">
              <div><span className="eyebrow">Product mix</span><h3>Share by fruit</h3></div>
              <span className="report-context">Boxes sold</span>
            </div>
            <PieChart data={freq} centerLabel="boxes" />
          </SpotlightCard>
        </FadeIn>
      </div>

      <div className="split">
        <FadeIn delay={140}>
          <SpotlightCard className="panel glass-panel report-panel">
            <div className="panel-head">
              <div><span className="eyebrow">Customer activity</span><h3>Vendor volume</h3></div>
              <span className="report-context">Ranked by boxes purchased</span>
            </div>
            {topVendor ? <div className="note-box report-leader"><strong>{topVendor.label}</strong><div className="sub">Leading vendor · <b>{topVendor.value} boxes</b>{topVendor.phone ? ` · ${topVendor.phone}` : ""}</div></div> : <div className="empty">Vendor rankings will appear after the first sale.</div>}
            <BarChart data={vendorBoxes.slice(0,5)} max={maxVend} valueLabel={(v)=>`${v} boxes`} emptyMessage="No vendor activity to rank yet." />
          </SpotlightCard>
        </FadeIn>
        <FadeIn delay={160}>
          <SpotlightCard className="panel glass-panel report-panel">
            <div className="panel-head">
              <div><span className="eyebrow">Receivables</span><h3>Payment status</h3></div>
              <span className="report-context">Sales by settlement status</span>
            </div>
            <BarChart data={paymentMix} max={maxPaymentCount} valueLabel={(value) => `${value} ${value === 1 ? "sale" : "sales"}`} emptyMessage="No sales have been recorded yet." />
          </SpotlightCard>
        </FadeIn>
      </div>

      <FadeIn delay={180}>
        <SpotlightCard className="panel glass-panel report-panel">
          <div className="panel-head">
            <div><span className="eyebrow">Inventory</span><h3>Stock on hand</h3></div>
            <span className="report-context">Quantities by fruit and package size</span>
          </div>
          <div className="table-wrap glass-table"><table>
            <thead><tr><th>Fruit</th><th>Small boxes</th><th>Medium boxes</th><th>Large boxes</th><th>Total boxes</th></tr></thead>
            <tbody>
              {stockRows.length === 0 ? <tr><td colSpan="5" className="empty">No stock data available.</td></tr> : stockRows.map(r => {
                const total = Number(r.small||0) + Number(r.medium||0) + Number(r.large||0);
                const cell = (v) => Number(v) <= 10 ? <span className="pill warn">{v}</span> : v;
                return <tr key={r.name}><td><div className="report-fruit-cell"><img src={FRUIT_IMAGES[r.name] || DEFAULT_PRODUCE_IMAGE} alt="" /><strong>{r.name}</strong></div></td><td className="mono">{cell(r.small)}</td><td className="mono">{cell(r.medium)}</td><td className="mono">{cell(r.large)}</td><td className="mono"><strong>{total}</strong></td></tr>;
              })}
            </tbody>
          </table></div>
          <p className="report-footnote">Low-stock quantities (10 boxes or fewer) are highlighted. Inventory remains separated by package size.</p>
        </SpotlightCard>
      </FadeIn>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useFarm } from "../utils/FarmContext";
import { salesApi, getErrorMessage } from "../services/api";
import { SIZES, PRICE_LIST, todayISO, money, getStockQty } from "../utils/store";
import { FadeIn, SpotlightCard, GradientText } from "../components/Bits";

export default function Sales() {
  const { data, loading, error: loadError, refresh } = useFarm();
  const initItem = () => {
    const f = data.fruits[0];
    return { fruitId: f ? String(f.id) : "", packagingSize: "small", quantity: 1, unitPrice: PRICE_LIST[f?.name]?.small ?? 0 };
  };
  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [paymentStatus, setPaymentStatus] = useState("PAID");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [items, setItems] = useState([{ fruitId: "", packagingSize: "small", quantity: 1, unitPrice: 0 }]);
  const [recordSearch, setRecordSearch] = useState("");
  const [recordVendor, setRecordVendor] = useState("all");
  const [recordStatus, setRecordStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!vendorId && data.vendors[0]) setVendorId(String(data.vendors[0].id));
    if (!items[0]?.fruitId && data.fruits[0]) setItems([initItem()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.vendors, data.fruits]);

  const onFruitOrSize = (i, patch) => setItems((prev) => prev.map((it, idx) => {
    if (idx !== i) return it;
    const next = { ...it, ...patch };
    const f = data.fruits.find((x) => String(x.id) === String(next.fruitId));
    if (patch.fruitId !== undefined || patch.packagingSize !== undefined) {
      next.unitPrice = PRICE_LIST[f?.name]?.[next.packagingSize] ?? 0;
    }
    return next;
  }));
  const updateItem = (i, patch) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const addItem = () => setItems((prev) => [...prev, initItem()]);
  const removeItem = (i) => setItems((prev) => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  const total = useMemo(() => items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0), [items]);
  const computedPaid = paymentStatus === "PAID" ? total : paymentStatus === "UNPAID" ? 0 : Number(paidAmount || 0);
  const balance = Math.max(0, total - computedPaid);
  const salesRecords = useMemo(() => data.sales.filter((sale) => {
    const vendor = sale.vendorName || data.vendors.find((item) => String(item.id) === String(sale.vendorId))?.name || "Unknown";
    const fruitNames = sale.items.map((item) => item.fruitName || data.fruits.find((fruit) => String(fruit.id) === String(item.fruitId))?.name || "Unknown");
    const searchable = [sale.id, sale.date, vendor, sale.paymentStatus, sale.paymentMethod, ...fruitNames, ...sale.items.map((item) => item.packagingSize)].join(" ").toLowerCase();
    return searchable.includes(recordSearch.trim().toLowerCase()) &&
      (recordVendor === "all" || String(sale.vendorId) === recordVendor) &&
      (recordStatus === "all" || sale.paymentStatus === recordStatus) &&
      (!dateFrom || sale.date >= dateFrom) &&
      (!dateTo || sale.date <= dateTo);
  }), [data.sales, data.vendors, data.fruits, recordSearch, recordVendor, recordStatus, dateFrom, dateTo]);
  const hasRecordFilters = Boolean(recordSearch || recordVendor !== "all" || recordStatus !== "all" || dateFrom || dateTo);
  const clearRecordFilters = () => {
    setRecordSearch("");
    setRecordVendor("all");
    setRecordStatus("all");
    setDateFrom("");
    setDateTo("");
  };

  const submit = async (e) => {
    e.preventDefault(); setMsg(null);
    if (!vendorId) { setMsg({ type: "error", text: "Select a vendor." }); return; }
    if (!date) { setMsg({ type: "error", text: "Sale date is required." }); return; }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.fruitId || !it.packagingSize) { setMsg({ type: "error", text: `Item ${i + 1}: fruit and packaging size are required.` }); return; }
      const qty = Number(it.quantity);
      if (!(qty > 0) || !Number.isInteger(qty)) { setMsg({ type: "error", text: `Item ${i + 1}: quantity must be a positive whole number.` }); return; }
      if (!(Number(it.unitPrice) >= 0)) { setMsg({ type: "error", text: `Item ${i + 1}: unit price must be 0 or greater.` }); return; }
      const avail = getStockQty(data, it.fruitId, it.packagingSize);
      if (qty > avail) {
        const f = data.fruits.find((x) => String(x.id) === String(it.fruitId));
        setMsg({ type: "error", text: `Not enough ${it.packagingSize} boxes of ${f?.name || "this fruit"}. You requested ${qty}, but only ${avail} are available. The sale was not recorded, and stock has not changed.` });
        return;
      }
    }
    if (paymentStatus === "PARTIALLY_PAID" && (computedPaid <= 0 || computedPaid >= total)) {
      setMsg({ type: "error", text: "For a partial payment, enter an amount greater than 0 and less than the sale total." }); return;
    }

    const payload = {
      vendor_id: Number(vendorId),
      sale_date: date,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      paid_amount: paymentStatus === "PARTIALLY_PAID" ? Number(paidAmount) : (paymentStatus === "PAID" ? total : 0),
      items: items.map((it) => ({
        fruit_id: Number(it.fruitId),
        packaging_size: it.packagingSize,
        quantity: Number(it.quantity),
        unit_price: Number(it.unitPrice),
      })),
    };
    setSaving(true);
    try {
      const res = await salesApi.create(payload);
      setMsg({ type: "success", text: res?.message || `Sale recorded. Total: ${money(total)}. Payment status: ${paymentStatus}. Stock has been updated.` });
      setItems([initItem()]);
      setPaidAmount("");
      await refresh(true);
    } catch (e) {
      setMsg({ type: "error", text: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container section page">
      <div className="page-banner glass-hero" style={{ backgroundImage: "linear-gradient(135deg,rgba(7,19,17,.7),rgba(28,143,99,.32)),url(https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1800&q=80)", backgroundPosition:"center 40%" }}>
        <div>
          <div className="banner-title-row">
            <img className="page-icon" src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=120&q=70" alt="" />
            <h1><GradientText>Sales Management</GradientText></h1>
          </div>
          <p>Add several fruits to a sale. The system calculates the total, checks stock, and tracks payment status.</p>
        </div>
        <button className="btn ghost" onClick={() => refresh(true)} disabled={loading}>Refresh</button>
      </div>

      {loadError && <div className="alert error">We couldn't load the data. {loadError}</div>}

      <FadeIn delay={40}>
        <SpotlightCard className="panel glass-panel">
          <div className="panel-head"><h3>Record New Sale</h3></div>
          {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}
          <form onSubmit={submit} className="page">
            <div className="form-grid">
              <div className="field span-2"><label>Vendor *</label><select value={vendorId} onChange={(e)=>setVendorId(e.target.value)} required>
                <option value="">Select vendor</option>{data.vendors.map((v)=><option key={v.id} value={v.id}>{v.name}</option>)}
              </select></div>
              <div className="field"><label>Sale Date *</label><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} required /></div>
              <div className="field"><label>Payment Status *</label><select value={paymentStatus} onChange={(e)=>setPaymentStatus(e.target.value)}><option value="PAID">PAID</option><option value="PARTIALLY_PAID">PARTIALLY_PAID</option><option value="UNPAID">UNPAID</option></select></div>
              <div className="field"><label>Payment Method *</label><select value={paymentMethod} onChange={(e)=>setPaymentMethod(e.target.value)}><option>Cash</option><option>Mobile Money</option><option>Credit</option></select></div>
              {paymentStatus === "PARTIALLY_PAID" && <div className="field"><label>Amount Paid (M) *</label><input type="number" min="0.01" step="0.01" value={paidAmount} onChange={(e)=>setPaidAmount(e.target.value)} required /></div>}
              <div className="field"><label>Auto-calculated Total</label><input readOnly value={money(total)} className="mono" /></div>
              <div className="field"><label>Payable / Balance</label><input readOnly value={`${money(computedPaid)} paid - ${money(balance)} balance`} className="mono" /></div>
            </div>

            <div className="line-items"><div className="table-wrap"><table>
              <thead><tr><th>Fruit</th><th>Packaging Size</th><th>Qty (boxes)</th><th>Unit Price (M)</th><th>Available</th><th>Line Total</th><th></th></tr></thead>
              <tbody>{items.map((it, i) => {
                const avail = it.fruitId ? getStockQty(data, it.fruitId, it.packagingSize) : 0;
                const req = Number(it.quantity || 0);
                return (<tr key={i}>
                  <td><select value={it.fruitId} onChange={(e)=>onFruitOrSize(i,{fruitId:e.target.value})} required><option value="">Select fruit</option>{data.fruits.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></td>
                  <td><select value={it.packagingSize} onChange={(e)=>onFruitOrSize(i,{packagingSize:e.target.value})}>{SIZES.map(s=><option key={s} value={s}>{s}</option>)}</select></td>
                  <td><input type="number" min="1" step="1" value={it.quantity} onChange={(e)=>updateItem(i,{quantity:e.target.value})} required /></td>
                  <td><input type="number" min="0" step="0.01" value={it.unitPrice} onChange={(e)=>updateItem(i,{unitPrice:e.target.value})} required /></td>
                  <td><span className={`pill ${req > avail ? "danger" : avail <= 10 ? "warn" : "ok"}`}>{avail} boxes</span></td>
                  <td className="mono"><strong>{money(req * (Number(it.unitPrice)||0))}</strong></td>
                  <td><button type="button" className="btn sm danger" onClick={()=>removeItem(i)}>Remove</button></td>
                </tr>);
              })}</tbody>
            </table></div></div>
            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={addItem}>+ Add Fruit Item</button>
              <button type="submit" className="btn primary" disabled={saving}>{saving ? "Saving..." : "Save Sale & Reduce Stock"}</button>
              <span className="sub">If any item is short on stock, the whole sale will be rejected and no stock will change.</span>
            </div>
          </form>
        </SpotlightCard>
      </FadeIn>

      <FadeIn delay={100}>
        <SpotlightCard className="panel glass-panel">
          <div className="panel-head"><h3>Sales Records ({salesRecords.length}/{data.sales.length})</h3></div>
          <div className="record-filters">
            <label className="field"><span>Search records</span><input className="glass-input" type="search" placeholder="Vendor, fruit, ID or method" value={recordSearch} onChange={(e) => setRecordSearch(e.target.value)} /></label>
            <label className="field"><span>Vendor</span><select value={recordVendor} onChange={(e) => setRecordVendor(e.target.value)}><option value="all">All vendors</option>{data.vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</select></label>
            <label className="field"><span>Payment status</span><select value={recordStatus} onChange={(e) => setRecordStatus(e.target.value)}><option value="all">All statuses</option><option value="PAID">Paid</option><option value="PARTIALLY_PAID">Partially paid</option><option value="UNPAID">Unpaid</option></select></label>
            <label className="field"><span>From</span><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
            <label className="field"><span>To</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
            <div className="record-filter-action"><button type="button" className="btn sm ghost" onClick={clearRecordFilters} disabled={!hasRecordFilters}>Clear filters</button></div>
          </div>
          <div className="table-wrap glass-table"><table>
            <thead><tr><th>ID</th><th>Date</th><th>Vendor</th><th>Items</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Method</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="9" className="empty">Loading sales...</td></tr> : salesRecords.length === 0 ? <tr><td colSpan="9" className="empty">{data.sales.length ? "No sales match these filters. Try adjusting the date range or search." : "No sales recorded yet. Record your first sale to a vendor above."}</td></tr> : salesRecords.map((s) => {
                const bal = Number(s.totalAmount) - Number(s.paidAmount || 0);
                return (<tr key={s.id}>
                  <td className="mono">{s.id}</td><td className="mono">{s.date}</td><td>{s.vendorName || data.vendors.find(v=>String(v.id)===String(s.vendorId))?.name || "Unknown"}</td>
                  <td>{s.items.map((it,i)=><div key={i}>{it.fruitName || data.fruits.find(f=>String(f.id)===String(it.fruitId))?.name || "Unknown"} <span className="badge-pack">{it.packagingSize}</span> - {it.quantity} @ {money(it.unitPrice)}</div>)}</td>
                  <td className="mono"><strong>{money(s.totalAmount)}</strong></td><td className="mono">{money(s.paidAmount)}</td>
                  <td className="mono">{bal>0 ? <span className="pill warn">{money(bal)}</span> : <span className="pill ok">M 0.00</span>}</td>
                  <td><span className={`pill ${s.paymentStatus==="PAID"?"ok":s.paymentStatus==="PARTIALLY_PAID"?"warn":"danger"}`}>{s.paymentStatus}</span></td>
                  <td>{s.paymentMethod}</td>
                </tr>);
              })}
            </tbody>
          </table></div>
        </SpotlightCard>
      </FadeIn>
    </div>
  );
}

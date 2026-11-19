import { useEffect, useMemo, useState } from "react";
import { useFarm } from "../utils/FarmContext";
import { purchasesApi, getErrorMessage } from "../services/api";
import { SIZES, todayISO, money } from "../utils/store";
import { FadeIn, SpotlightCard, GradientText } from "../components/Bits";

const blankItem = (fruitId) => ({ fruitId: fruitId || "", packagingSize: "small", quantity: 1, unitCost: 0 });

export default function Purchases() {
  const { data, loading, error: loadError, refresh } = useFarm();
  const [supplierId, setSupplierId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState([blankItem("")]);
  const [recordSearch, setRecordSearch] = useState("");
  const [recordSupplier, setRecordSupplier] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supplierId && data.suppliers[0]) setSupplierId(String(data.suppliers[0].id));
    if (!items[0]?.fruitId && data.fruits[0]) setItems([blankItem(String(data.fruits[0].id))]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.suppliers, data.fruits]);

  const updateItem = (i, patch) => setItems((prev) => prev.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const addItem = () => setItems((prev) => [...prev, blankItem(String(data.fruits[0]?.id || ""))]);
  const removeItem = (i) => setItems((prev) => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev);

  const total = useMemo(() => items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0), 0), [items]);
  const purchaseRecords = useMemo(() => data.purchases.filter((purchase) => {
    const supplier = purchase.supplierName || data.suppliers.find((item) => String(item.id) === String(purchase.supplierId))?.businessName || "Unknown";
    const fruitNames = purchase.items.map((item) => item.fruitName || data.fruits.find((fruit) => String(fruit.id) === String(item.fruitId))?.name || "Unknown");
    const searchable = [purchase.id, purchase.date, supplier, ...fruitNames, ...purchase.items.map((item) => item.packagingSize)].join(" ").toLowerCase();
    return searchable.includes(recordSearch.trim().toLowerCase()) &&
      (recordSupplier === "all" || String(purchase.supplierId) === recordSupplier) &&
      (!dateFrom || purchase.date >= dateFrom) &&
      (!dateTo || purchase.date <= dateTo);
  }), [data.purchases, data.suppliers, data.fruits, recordSearch, recordSupplier, dateFrom, dateTo]);
  const hasRecordFilters = Boolean(recordSearch || recordSupplier !== "all" || dateFrom || dateTo);
  const clearRecordFilters = () => {
    setRecordSearch("");
    setRecordSupplier("all");
    setDateFrom("");
    setDateTo("");
  };

  const submit = async (e) => {
    e.preventDefault(); setMsg(null);
    if (!supplierId) { setMsg({ type: "error", text: "Select a supplier." }); return; }
    if (!date) { setMsg({ type: "error", text: "Purchase date is required." }); return; }
    if (!items.length) { setMsg({ type: "error", text: "Add at least one fruit item." }); return; }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.fruitId || !it.packagingSize) { setMsg({ type: "error", text: `Item ${i + 1}: fruit and packaging size are required.` }); return; }
      if (!(Number(it.quantity) > 0) || !Number.isInteger(Number(it.quantity))) { setMsg({ type: "error", text: `Item ${i + 1}: quantity must be a positive whole number.` }); return; }
      if (!(Number(it.unitCost) >= 0)) { setMsg({ type: "error", text: `Item ${i + 1}: unit cost must be 0 or greater.` }); return; }
    }
    const payload = {
      supplier_id: Number(supplierId),
      purchase_date: date,
      items: items.map((it) => ({
        fruit_id: Number(it.fruitId),
        packaging_size: it.packagingSize,
        quantity: Number(it.quantity),
        unit_cost: Number(it.unitCost),
      })),
    };
    setSaving(true);
    try {
      const res = await purchasesApi.create(payload);
      setMsg({ type: "success", text: res?.message || `Purchase recorded. Total: ${money(total)}. Stock has been updated.` });
      setItems([blankItem(String(data.fruits[0]?.id || ""))]);
      await refresh(true);
    } catch (e) {
      setMsg({ type: "error", text: getErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container section page">
      <div className="page-banner glass-hero" style={{ backgroundImage: "linear-gradient(135deg,rgba(7,19,17,.7),rgba(28,143,99,.32)),url(https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1800&q=80)", backgroundPosition:"center" }}>
        <div>
          <div className="banner-title-row">
            <img className="page-icon" src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=120&q=70" alt="" />
            <h1><GradientText>Purchase Management</GradientText></h1>
          </div>
          <p>Add several fruits to a supplier purchase. The system calculates the total and updates stock for each box size.</p>
        </div>
        <button className="btn ghost" onClick={() => refresh(true)} disabled={loading}>Refresh</button>
      </div>

      {(loadError) && <div className="alert error">We couldn't load the data. {loadError}</div>}

      <FadeIn delay={40}>
        <SpotlightCard className="panel glass-panel">
          <div className="panel-head"><h3>Record New Purchase</h3></div>
          {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}
          <form onSubmit={submit} className="page">
            <div className="form-grid">
              <div className="field span-2"><label>Supplier *</label><select value={supplierId} onChange={(e)=>setSupplierId(e.target.value)} required>
                <option value="">Select supplier</option>
                {data.suppliers.map((s)=><option key={s.id} value={s.id}>{s.businessName} ({s.province})</option>)}
              </select></div>
              <div className="field"><label>Purchase Date *</label><input type="date" value={date} onChange={(e)=>setDate(e.target.value)} required /></div>
              <div className="field"><label>Calculated Total (auto)</label><input readOnly value={money(total)} className="mono" /></div>
            </div>

            <div className="line-items">
              <div className="table-wrap"><table>
                <thead><tr><th>Fruit</th><th>Packaging Size</th><th>Quantity (boxes)</th><th>Unit Cost (M)</th><th>Line Total</th><th></th></tr></thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td><select value={it.fruitId} onChange={(e)=>updateItem(i,{fruitId:e.target.value})} required><option value="">Select fruit</option>{data.fruits.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></td>
                      <td><select value={it.packagingSize} onChange={(e)=>updateItem(i,{packagingSize:e.target.value})}>{SIZES.map(s=><option key={s} value={s}>{s}</option>)}</select></td>
                      <td><input type="number" min="1" step="1" value={it.quantity} onChange={(e)=>updateItem(i,{quantity:e.target.value})} required /></td>
                      <td><input type="number" min="0" step="0.01" value={it.unitCost} onChange={(e)=>updateItem(i,{unitCost:e.target.value})} required /></td>
                      <td className="mono"><strong>{money((Number(it.quantity)||0)*(Number(it.unitCost)||0))}</strong></td>
                      <td><button type="button" className="btn sm danger" onClick={()=>removeItem(i)}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={addItem}>+ Add Fruit Item</button>
              <button type="submit" className="btn primary" disabled={saving}>{saving ? "Saving..." : "Save Purchase & Update Stock"}</button>
            </div>
          </form>
        </SpotlightCard>
      </FadeIn>

      <FadeIn delay={100}>
        <SpotlightCard className="panel glass-panel">
          <div className="panel-head"><h3>Purchase Records ({purchaseRecords.length}/{data.purchases.length})</h3></div>
          <div className="record-filters">
            <label className="field"><span>Search records</span><input className="glass-input" type="search" placeholder="Supplier, fruit or ID" value={recordSearch} onChange={(e) => setRecordSearch(e.target.value)} /></label>
            <label className="field"><span>Supplier</span><select value={recordSupplier} onChange={(e) => setRecordSupplier(e.target.value)}><option value="all">All suppliers</option>{data.suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.businessName}</option>)}</select></label>
            <label className="field"><span>From</span><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label>
            <label className="field"><span>To</span><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label>
            <div className="record-filter-action"><button type="button" className="btn sm ghost" onClick={clearRecordFilters} disabled={!hasRecordFilters}>Clear filters</button></div>
          </div>
          <div className="table-wrap glass-table"><table>
            <thead><tr><th>ID</th><th>Date</th><th>Supplier</th><th>Items</th><th>Total Amount</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="5" className="empty">Loading purchases...</td></tr> : purchaseRecords.length === 0 ? <tr><td colSpan="5" className="empty">{data.purchases.length ? "No purchases match these filters. Try adjusting the date range or search." : "No purchases recorded yet. Record your first purchase from a supplier above."}</td></tr> : purchaseRecords.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.id}</td><td className="mono">{p.date}</td><td>{p.supplierName || data.suppliers.find(s=>String(s.id)===String(p.supplierId))?.businessName || "Unknown"}</td>
                  <td>{p.items.map((it,i)=><div key={i}>{it.fruitName || data.fruits.find(f=>String(f.id)===String(it.fruitId))?.name || "Unknown"} <span className="badge-pack">{it.packagingSize}</span> - {it.quantity} @ {money(it.unitCost)}</div>)}</td>
                  <td className="mono"><strong>{money(p.totalAmount)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </SpotlightCard>
      </FadeIn>
    </div>
  );
}

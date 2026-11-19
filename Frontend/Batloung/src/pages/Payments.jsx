import { useMemo, useState } from "react";
import { useFarm } from "../utils/FarmContext";
import { paymentsApi, getErrorMessage } from "../services/api";
import { money, vendorName, vendorOutstanding } from "../utils/store";
import { FadeIn, SpotlightCard, GradientText } from "../components/Bits";

export default function Payments() {
  const { data, loading, error: loadError, refresh, stats } = useFarm();
  const [selected, setSelected] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const vendorsWithBalance = useMemo(() => data.vendors.map((v) => ({ ...v, balance: vendorOutstanding(data, v.id) })).sort((a,b)=>b.balance-a.balance), [data]);
  const unpaidSales = useMemo(() => data.sales.filter((s) => (selected ? String(s.vendorId) === String(selected) : true) && (Number(s.totalAmount) - Number(s.paidAmount||0)) > 0.001), [data, selected]);

  const recordPayment = async (e) => {
    e.preventDefault(); setMsg(null);
    const payAmt = Number(amount);
    if (!selected) { setMsg({ type:"error", text:"Select a vendor." }); return; }
    if (!(payAmt > 0)) { setMsg({ type:"error", text:"Enter a valid payment amount greater than 0." }); return; }
    const bal = vendorOutstanding(data, selected);
    if (payAmt > bal + 0.001) { setMsg({ type:"error", text:`Amount exceeds outstanding balance (${money(bal)}).` }); return; }
    setSaving(true);
    try {
      const res = await paymentsApi.record({ vendor_id: Number(selected), amount: payAmt, payment_method: method });
      setMsg({ type:"success", text: res?.message || `Payment of ${money(payAmt)} recorded for ${vendorName(data, selected)}.` });
      setAmount("");
      await refresh(true);
    } catch (e) { setMsg({ type:"error", text: getErrorMessage(e) }); }
    finally { setSaving(false); }
  };

  return (
    <div className="container section page">
      <div className="page-banner glass-hero" style={{ backgroundImage: "linear-gradient(135deg,rgba(7,19,17,.7),rgba(28,143,99,.32)),url(https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1800&q=80)", backgroundPosition:"center" }}>
        <div>
          <div className="banner-title-row">
            <img className="page-icon" src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=120&q=70" alt="" />
            <h1><GradientText>Payments</GradientText></h1>
          </div>
          <p>Record cash, mobile money, or credit payments, and see how much each vendor still owes.</p>
        </div>
        <button className="btn ghost" onClick={() => refresh(true)} disabled={loading}>Refresh</button>
      </div>

      {loadError && <div className="alert error">We couldn't load the data. {loadError}</div>}

      <div className="stat-cards">
        <div className="stat-card tone-green"><div className="stat-label">Total Received</div><div className="stat-value">{money(stats.received)}</div><div className="stat-note">All payments applied</div></div>
        <div className="stat-card tone-orange"><div className="stat-label">Outstanding Balance</div><div className="stat-value">{money(stats.outstanding)}</div><div className="stat-note">Unpaid / partial sales</div></div>
        <div className="stat-card tone-gold"><div className="stat-label">Total Sales Value</div><div className="stat-value">{money(stats.salesTotal)}</div><div className="stat-note">{data.sales.length} sales</div></div>
      </div>

      <div className="split">
        <FadeIn delay={40}>
          <SpotlightCard className="panel glass-panel">
            <div className="panel-head"><h3>Record Vendor Payment</h3></div>
            {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}
            <form className="form-grid" style={{gridTemplateColumns:"1fr"}} onSubmit={recordPayment}>
              <div className="field"><label>Vendor *</label><select value={selected} onChange={(e)=>setSelected(e.target.value)} required>
                <option value="">Select vendor</option>
                {vendorsWithBalance.map(v=><option key={v.id} value={v.id}>{v.name} (Balance: {money(v.balance)})</option>)}
              </select></div>
              <div className="field"><label>Payment Amount (M) *</label><input type="number" min="0.01" step="0.01" value={amount} onChange={(e)=>setAmount(e.target.value)} required /></div>
              <div className="field"><label>Payment Method *</label><select value={method} onChange={(e)=>setMethod(e.target.value)}><option>Cash</option><option>Mobile Money</option><option>Credit</option></select></div>
              {selected && <div className="note-box">Outstanding balance: <b>{money(vendorOutstanding(data, selected))}</b>. Payments go toward the oldest unpaid or partially paid sales first.</div>}
              <div className="form-actions"><button className="btn primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Record Payment"}</button></div>
            </form>
          </SpotlightCard>
        </FadeIn>

        <FadeIn delay={80}>
          <SpotlightCard className="panel glass-panel">
            <div className="panel-head"><h3>Vendor Balances</h3></div>
            <div className="table-wrap glass-table"><table>
              <thead><tr><th>Vendor</th><th>Phone</th><th>Outstanding</th></tr></thead>
              <tbody>{loading ? <tr><td colSpan="3" className="empty">Loading balances...</td></tr> : vendorsWithBalance.map(v=>(<tr key={v.id}><td><strong>{v.name}</strong></td><td className="mono">{v.phone}</td><td>{v.balance>0?<span className="pill warn">{money(v.balance)}</span>:<span className="pill ok">M 0.00</span>}</td></tr>))}</tbody>
            </table></div>
          </SpotlightCard>
        </FadeIn>
      </div>

      <FadeIn delay={100}>
        <SpotlightCard className="panel glass-panel">
          <div className="panel-head"><h3>Unpaid and Partially Paid Sales {selected ? "(filtered)" : ""}</h3></div>
          <div className="table-wrap glass-table"><table>
            <thead><tr><th>Sale</th><th>Date</th><th>Vendor</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Method</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan="8" className="empty">Loading sales...</td></tr> : unpaidSales.length === 0 ? <tr><td colSpan="8" className="empty">Nothing outstanding — every sale is fully paid.</td></tr> : unpaidSales.map(s=>{
                const bal = Number(s.totalAmount)-Number(s.paidAmount||0);
                return <tr key={s.id}><td className="mono">{s.id}</td><td className="mono">{s.date}</td><td>{s.vendorName || vendorName(data,s.vendorId)}</td><td className="mono">{money(s.totalAmount)}</td><td className="mono">{money(s.paidAmount)}</td><td className="mono"><strong>{money(bal)}</strong></td><td><span className={`pill ${s.paymentStatus==="PARTIALLY_PAID"?"warn":"danger"}`}>{s.paymentStatus}</span></td><td>{s.paymentMethod}</td></tr>;
              })}
            </tbody>
          </table></div>
        </SpotlightCard>
      </FadeIn>
    </div>
  );
}

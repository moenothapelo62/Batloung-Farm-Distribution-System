import { useMemo, useRef, useState } from "react";
import { useFarm } from "../utils/FarmContext";
import { vendorsApi, getErrorMessage } from "../services/api";
import { todayISO, vendorOutstanding, money } from "../utils/store";
import { FadeIn, SpotlightCard, FilterChips, GradientText } from "../components/Bits";
import LocationLink from "../components/LocationLink";

const empty = { name: "", phone: "", location: "", registrationDate: todayISO() };
const PAGE_ICON = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=120&q=70";

export default function Vendors() {
  const { data, loading, error: loadError, refresh } = useFarm();
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");
  const [balanceFilter, setBalanceFilter] = useState("All");
  const [viewMode, setViewMode] = useState("cards");
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const formRef = useRef(null);

  const list = useMemo(() => data.vendors.filter((v) => {
    const text = [v.name, v.phone, v.location].join(" ").toLowerCase();
    const bal = vendorOutstanding(data, v.id);
    const matchesBalance = balanceFilter === "All" || (balanceFilter === "Outstanding" ? bal > 0 : bal === 0);
    return text.includes(q.toLowerCase()) && matchesBalance;
  }), [data, q, balanceFilter]);

  const reset = () => { setForm(empty); setEditingId(null); setErr(""); };
  const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (!form.name.trim() || !form.phone.trim() || !form.location.trim() || !form.registrationDate) {
      setErr("Please enter the vendor's name, phone number, location, and registration date."); return;
    }
    const payload = {
      vendor_name: form.name.trim(),
      phone_number: form.phone.trim(),
      location: form.location.trim(),
      registration_date: form.registrationDate,
    };
    setSaving(true);
    try {
      if (editingId) {
        await vendorsApi.update(editingId, payload);
        setMsg("Vendor updated.");
      } else {
        await vendorsApi.create(payload);
        setMsg("Vendor added.");
      }
      reset();
      await refresh(true);
    } catch (e) { setErr(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const edit = (v) => {
    setForm({ name: v.name, phone: v.phone, location: v.location, registrationDate: v.registrationDate || todayISO() });
    setEditingId(v.id); setErr(""); setMsg("");
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const del = async (id) => {
    if (!confirm("Delete this vendor? Vendors with sales records can't be deleted.")) return;
    setErr(""); setMsg(""); setDeletingId(id);
    try {
      await vendorsApi.remove(id);
      if (String(editingId) === String(id)) reset();
      setMsg("Vendor deleted.");
      await refresh(true);
    } catch (e) { setErr(getErrorMessage(e)); }
    finally { setDeletingId(null); }
  };

  return (
    <div className="container section page">
      <div className="page-banner glass-hero" style={{ backgroundImage: "linear-gradient(135deg,rgba(7,19,17,.72),rgba(28,143,99,.35)),url(https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1800&q=80)", backgroundPosition:"center" }}>
        <div>
          <div className="banner-title-row">
            <img className="page-icon" src={PAGE_ICON} alt="" />
            <h1><GradientText>Vendors</GradientText></h1>
          </div>
          <p>Add street vendors and retailers, search by name or phone, and keep track of outstanding balances.</p>
        </div>
        <button className="btn ghost" type="button" onClick={() => refresh(true)} disabled={loading}>Refresh</button>
      </div>

      {loadError && <div className="alert error">We couldn't load the data. {loadError}</div>}

      <div ref={formRef} />
      <FadeIn delay={40}>
        <SpotlightCard className={`panel glass-panel ${editingId ? "editing-panel" : ""}`}>
          <div className="panel-head"><h3>{editingId ? `Update Vendor #${editingId}` : "Register New Vendor"}</h3>{editingId && <span className="pill info">Editing</span>}</div>
          {err && <div className="alert error">{err}</div>}
          {msg && <div className="alert success">{msg}</div>}
          <form className="form-grid" onSubmit={submit}>
            <div className="field span-2"><label>Vendor Name *</label><input className="glass-input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="e.g. Maseru Street Market" required /></div>
            <div className="field"><label>Phone Number *</label><input className="glass-input" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} placeholder="+266 ..." required /></div>
            <div className="field"><label>Location *</label><input className="glass-input" value={form.location} onChange={(e)=>setForm({...form,location:e.target.value})} placeholder="Area / market" required /></div>
            <div className="field"><label>Registration Date *</label><input type="date" value={form.registrationDate} onChange={(e)=>setForm({...form,registrationDate:e.target.value})} required /></div>
            <div className="form-actions">
              <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save Changes" : "Register Vendor"}</button>
              {editingId && <button type="button" className="btn ghost" onClick={reset}>Cancel Edit</button>}
            </div>
          </form>
        </SpotlightCard>
      </FadeIn>

      <FadeIn delay={100}>
        <SpotlightCard className="panel glass-panel">
          <div className="panel-head" style={{flexWrap:"wrap", gap:12}}>
            <h3>Registered Vendors ({list.length}/{data.vendors.length})</h3>
            <div className="vendor-list-tools">
              <input className="glass-input" placeholder="Search by name or phone..." value={q} onChange={(e)=>setQ(e.target.value)} />
              <div className="vendor-mode-switch" role="group" aria-label="Vendor display">
                <button type="button" className={`btn sm ${viewMode === "cards" ? "primary" : "ghost"}`} aria-pressed={viewMode === "cards"} onClick={()=>setViewMode("cards")}>▦ Cards</button>
                <button type="button" className={`btn sm ${viewMode === "table" ? "primary" : "ghost"}`} aria-pressed={viewMode === "table"} onClick={()=>setViewMode("table")}>☰ Table</button>
              </div>
            </div>
          </div>
          <FilterChips options={["All","Outstanding","Settled"]} value={balanceFilter} onChange={setBalanceFilter} />
          {viewMode === "cards" ? (
            <div className="vendor-gallery">
              {loading ? <div className="empty">Loading vendors...</div> : list.length === 0 ? <div className="empty">No vendors match your filters.</div> : list.map((v) => {
                const bal = vendorOutstanding(data, v.id);
                return (
                  <article key={v.id} className={`vendor-card glass-card ${String(editingId) === String(v.id) ? "is-editing" : ""}`}>
                    <div className="vendor-card-head">
                      <div className="vendor-avatar" aria-hidden="true">{initials(v.name)}</div>
                      <div className="vendor-card-title">
                        <div className="vendor-card-meta">
                          <span>Vendor #{v.id}</span>
                          <span className={`pill ${bal > 0 ? "warn" : "ok"}`}>{bal > 0 ? "Outstanding" : "Settled"}</span>
                        </div>
                        <h4>{v.name}</h4>
                      </div>
                    </div>
                    <div className="vendor-card-details">
                      <a className="vendor-detail" href={`tel:${v.phone}`}>
                        <span>Phone number</span><strong>{v.phone}</strong>
                      </a>
                      {v.location ? (
                        <LocationLink address={`${v.location}, Lesotho`} className="vendor-detail">
                          <span>Directions from your location</span><strong>{v.location}</strong>
                        </LocationLink>
                      ) : <div className="vendor-detail"><span>Location</span><strong>-</strong></div>}
                      <div className="vendor-detail"><span>Registered</span><strong>{v.registrationDate || "-"}</strong></div>
                    </div>
                    <div className="vendor-balance">
                      <span>Outstanding balance</span>
                      <strong>{money(bal)}</strong>
                    </div>
                    <div className="actions">
                      <button type="button" className="btn sm ghost" onClick={()=>edit(v)}>Edit</button>
                      <button type="button" className="btn sm danger" onClick={()=>del(v.id)} disabled={String(deletingId) === String(v.id)}>{String(deletingId) === String(v.id) ? "Deleting..." : "Delete"}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="table-wrap glass-table" style={{marginTop:10}}>
              <table>
                <thead><tr><th>ID</th><th>Vendor Name</th><th>Phone</th><th>Location</th><th>Registration Date</th><th>Outstanding Balance</th><th>Actions</th></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan="7" className="empty">Loading vendors...</td></tr> : list.length === 0 ? <tr><td colSpan="7" className="empty">No vendors match your search. Clear the filters or register a vendor above.</td></tr> : list.map((v) => {
                    const bal = vendorOutstanding(data, v.id);
                    return (
                      <tr key={v.id} className={String(editingId) === String(v.id) ? "row-editing" : ""}>
                        <td className="mono">{v.id}</td><td><strong>{v.name}</strong></td><td className="mono">{v.phone}</td>
                        <td>{v.location ? <LocationLink address={`${v.location}, Lesotho`}>View on map: {v.location}</LocationLink> : <span className="sub">-</span>}</td>
                        <td className="mono">{v.registrationDate || "-"}</td>
                        <td className="mono">{bal > 0 ? <span className="pill warn">{money(bal)}</span> : <span className="pill ok">M 0.00</span>}</td>
                        <td className="actions"><button type="button" className="btn sm ghost" onClick={()=>edit(v)}>Edit</button><button type="button" className="btn sm danger" onClick={()=>del(v.id)} disabled={String(deletingId) === String(v.id)}>{String(deletingId) === String(v.id) ? "Deleting..." : "Delete"}</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SpotlightCard>
      </FadeIn>
    </div>
  );
}

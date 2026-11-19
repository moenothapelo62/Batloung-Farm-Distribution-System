import { useMemo, useRef, useState } from "react";
import { useFarm } from "../utils/FarmContext";
import { suppliersApi, getErrorMessage } from "../services/api";
import { PROVINCES } from "../utils/store";
import { FadeIn, SpotlightCard, FilterChips, GradientText } from "../components/Bits";
import LocationLink from "../components/LocationLink";

const empty = { businessName: "", contactPerson: "", phone: "", province: PROVINCES[0], address: "" };
const PAGE_ICON = "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=120&q=70";

export default function Suppliers() {
  const { data, loading, error: loadError, refresh } = useFarm();
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  const list = useMemo(() => data.suppliers.filter((s) => {
    const text = [s.businessName, s.contactPerson, s.phone, s.province, s.address].join(" ").toLowerCase();
    return text.includes(q.toLowerCase()) && (provinceFilter === "All" || s.province === provinceFilter);
  }), [data.suppliers, q, provinceFilter]);

  const reset = () => { setForm(empty); setEditingId(null); setErr(""); };

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    if (!form.businessName.trim() || !form.contactPerson.trim() || !form.phone.trim() || !form.province || !form.address.trim()) {
      setErr("Please complete all supplier fields: business name, contact person, phone, province, and address."); return;
    }
    const payload = {
      business_name: form.businessName.trim(),
      contact_person: form.contactPerson.trim(),
      phone: form.phone.trim(),
      province: form.province,
      address: form.address.trim(),
    };
    setSaving(true);
    try {
      if (editingId) {
        await suppliersApi.update(editingId, payload);
        setMsg("Supplier updated.");
      } else {
        await suppliersApi.create(payload);
        setMsg("Supplier added.");
      }
      reset();
      await refresh(true);
    } catch (e) { setErr(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const edit = (s) => {
    setForm({ businessName: s.businessName, contactPerson: s.contactPerson, phone: s.phone, province: s.province, address: s.address });
    setEditingId(s.id); setErr(""); setMsg("");
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const del = async (id) => {
    if (!confirm("Delete this supplier? Suppliers with purchase records can't be deleted.")) return;
    setErr(""); setMsg("");
    try {
      await suppliersApi.remove(id);
      if (String(editingId) === String(id)) reset();
      setMsg("Supplier deleted.");
      await refresh(true);
    } catch (e) { setErr(getErrorMessage(e)); }
  };

  return (
    <div className="container section page">
      <div className="page-banner glass-hero" style={{ backgroundImage: "linear-gradient(135deg,rgba(7,19,17,.72),rgba(28,143,99,.35)),url(https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1800&q=80)", backgroundPosition:"center 45%" }}>
        <div>
          <div className="banner-title-row">
            <img className="page-icon" src={PAGE_ICON} alt="" />
            <h1><GradientText>Suppliers</GradientText></h1>
          </div>
          <p>Add fruit suppliers from across South Africa and keep their details up to date.</p>
        </div>
        <button className="btn ghost" type="button" onClick={() => refresh(true)} disabled={loading}>Refresh</button>
      </div>

      {loadError && <div className="alert error">We couldn't load the data. {loadError}</div>}

      <div ref={formRef} />
      <FadeIn delay={40}>
        <SpotlightCard className={`panel glass-panel ${editingId ? "editing-panel" : ""}`}>
          <div className="panel-head"><h3>{editingId ? `Update Supplier #${editingId}` : "Register New Supplier"}</h3>{editingId && <span className="pill info">Editing</span>}</div>
          {err && <div className="alert error">{err}</div>}
          {msg && <div className="alert success">{msg}</div>}
          <form className="form-grid" onSubmit={submit}>
            <div className="field span-2"><label>Business Name *</label><input className="glass-input" value={form.businessName} onChange={(e)=>setForm({...form,businessName:e.target.value})} placeholder="e.g. Highveld Fresh Produce" required /></div>
            <div className="field"><label>Contact Person *</label><input className="glass-input" value={form.contactPerson} onChange={(e)=>setForm({...form,contactPerson:e.target.value})} placeholder="Full name" required /></div>
            <div className="field"><label>Phone *</label><input className="glass-input" value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} placeholder="+27 ..." required /></div>
            <div className="field"><label>Province *</label><select value={form.province} onChange={(e)=>setForm({...form,province:e.target.value})} required>{PROVINCES.map(p=><option key={p} value={p}>{p}</option>)}</select></div>
            <div className="field span-2"><label>Address *</label><input className="glass-input" value={form.address} onChange={(e)=>setForm({...form,address:e.target.value})} placeholder="Street, city" required /></div>
            <div className="form-actions">
              <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save Changes" : "Register Supplier"}</button>
              {editingId && <button type="button" className="btn ghost" onClick={reset}>Cancel Edit</button>}
            </div>
          </form>
        </SpotlightCard>
      </FadeIn>

      <FadeIn delay={100}>
        <SpotlightCard className="panel glass-panel">
          <div className="panel-head" style={{flexWrap:"wrap", gap:12}}>
            <h3>All Suppliers ({list.length}/{data.suppliers.length})</h3>
            <div className="toolbar"><input className="glass-input" placeholder="Search by name, phone, province..." value={q} onChange={(e)=>setQ(e.target.value)} /></div>
          </div>
          <FilterChips options={["All", ...PROVINCES]} value={provinceFilter} onChange={setProvinceFilter} />
          <div className="table-wrap glass-table" style={{marginTop:10}}>
            <table>
              <thead><tr><th>ID</th><th>Business Name</th><th>Contact Person</th><th>Phone</th><th>Province</th><th>Address</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan="7" className="empty">Loading suppliers...</td></tr> : list.length === 0 ? <tr><td colSpan="7" className="empty">No suppliers match your search. Try a different keyword, or register a supplier above.</td></tr> : list.map((s) => (
                  <tr key={s.id} className={String(editingId) === String(s.id) ? "row-editing" : ""}>
                    <td className="mono">{s.id}</td><td><strong>{s.businessName}</strong></td><td>{s.contactPerson}</td><td className="mono">{s.phone}</td>
                    <td><span className="pill info">{s.province}</span></td>
                    <td>{s.address ? <LocationLink address={`${s.address}, ${s.province}, South Africa`}>View on map: {s.address}</LocationLink> : <span className="sub">-</span>}</td>
                    <td className="actions"><button type="button" className="btn sm ghost" onClick={()=>edit(s)}>Edit</button><button type="button" className="btn sm danger" onClick={()=>del(s.id)}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SpotlightCard>
      </FadeIn>
    </div>
  );
}

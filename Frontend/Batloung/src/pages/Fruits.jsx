import { useMemo, useRef, useState } from "react";
import { useFarm } from "../utils/FarmContext";
import { fruitsApi, getErrorMessage } from "../services/api";
import { FRUIT_NAMES, FRUIT_IMAGES, DEFAULT_PRODUCE_IMAGE, PRICE_LIST, SIZES, getStockQty } from "../utils/store";
import { FadeIn, SpotlightCard, FilterChips, TiltCard, GradientText } from "../components/Bits";

const empty = { name: "", description: "", status: "Available" };

export default function Fruits() {
  const { data, loading, error: loadError, refresh } = useFarm();
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const formRef = useRef(null);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    const fruitName = form.name.trim();
    if (!fruitName) { setErr("Fruit name is required."); return; }
    if (fruitName.length > 50) { setErr("Fruit name must be 50 characters or fewer."); return; }
    const payload = { fruit_name: fruitName, description: form.description, status: form.status };
    setSaving(true);
    try {
      if (editingId) {
        await fruitsApi.update(editingId, payload);
        setMsg("Fruit updated.");
      } else {
        await fruitsApi.create(payload);
        setMsg("Fruit added. Stock is now tracked separately for small, medium, and large boxes.");
      }
      setForm(empty); setEditingId(null);
      await refresh(true);
    } catch (e) { setErr(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const edit = (f) => {
    setForm({ name: f.name, description: f.description || "", status: f.status || "Available" });
    setEditingId(f.id); setErr(""); setMsg("");
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const del = async (id) => {
    if (!confirm("Delete this fruit? Fruits used in purchases or sales can't be deleted.")) return;
    setErr(""); setMsg("");
    try {
      await fruitsApi.remove(id);
      if (String(editingId) === String(id)) { setForm(empty); setEditingId(null); }
      setMsg("Fruit deleted.");
      await refresh(true);
    } catch (e) { setErr(getErrorMessage(e)); }
  };

  const list = useMemo(() => data.fruits.filter((f) => {
    const matchesQ = !q || f.name.toLowerCase().includes(q.toLowerCase()) || (f.description || "").toLowerCase().includes(q.toLowerCase());
    const matchesStatus = statusFilter === "All" || f.status === statusFilter;
    return matchesQ && matchesStatus;
  }), [data.fruits, q, statusFilter]);

  const availability = (qty) => {
    if (qty <= 0) return { label: "Out of stock", tone: "danger" };
    if (qty <= 10) return { label: `Low · ${qty} left`, tone: "warn" };
    return { label: `${qty} boxes`, tone: "ok" };
  };

  return (
    <div className="container section page">
      <div className="page-banner glass-hero" style={{ backgroundImage: "linear-gradient(135deg,rgba(7,19,17,.68),rgba(28,143,99,.3)),url(https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1800&q=80)", backgroundPosition:"center" }}>
        <div>
          <div className="banner-title-row">
            <img className="page-icon" src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=120&q=70" alt="" />
            <h1><GradientText>Fruits & Produce</GradientText></h1>
          </div>
          <p>Add fruit types and check stock for small, medium, and large boxes.</p>
        </div>
        <button className="btn ghost" type="button" onClick={() => refresh(true)} disabled={loading}>Refresh</button>
      </div>

      {loadError && <div className="alert error">We couldn't load the data. {loadError}</div>}

      <div ref={formRef} />
      <FadeIn delay={40}>
        <SpotlightCard className={`panel glass-panel ${editingId ? "editing-panel" : ""}`}>
          <div className="panel-head"><h3>{editingId ? `Update Fruit #${editingId}` : "Register New Fruit Type"}</h3>{editingId && <span className="pill info">Editing</span>}</div>
          {err && <div className="alert error">{err}</div>}
          {msg && <div className="alert success">{msg}</div>}
          <form className="form-grid" style={{gridTemplateColumns:"1fr 1fr"}} onSubmit={submit}>
            <div className="field"><label>Fruit Name *</label><input className="glass-input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="e.g. Dragon fruit" maxLength="50" required /></div>
            <div className="field"><label>Status</label><select value={form.status} onChange={(e)=>setForm({...form,status:e.target.value})}><option>Available</option><option>Unavailable</option><option>Seasonal</option></select></div>
            <div className="field span-2"><label>Description</label><textarea rows="2" value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} placeholder="Short description" /></div>
            <p className="sub">The required fruits are already listed: {FRUIT_NAMES.join(", ")}. You can add other produce, too.</p>
            <div className="form-actions">
              <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saving..." : editingId ? "Save Changes" : "Register Fruit"}</button>
              {editingId && <button type="button" className="btn ghost" onClick={()=>{setForm(empty);setEditingId(null);setErr("");}}>Cancel Edit</button>}
            </div>
          </form>
        </SpotlightCard>
      </FadeIn>

      <FadeIn delay={100}>
        <SpotlightCard className="panel glass-panel">
          <div className="panel-head" style={{flexWrap:"wrap", gap:12}}>
            <h3>Registered Fruits ({list.length}/{data.fruits.length})</h3>
            <div className="toolbar"><input className="glass-input" placeholder="Search fruits..." value={q} onChange={(e)=>setQ(e.target.value)} /></div>
          </div>
          <FilterChips options={["All","Available","Unavailable","Seasonal"]} value={statusFilter} onChange={setStatusFilter} />
          <div className="fruit-gallery" style={{marginTop:14}}>
            {loading ? <div className="empty">Loading fruits...</div> : list.length === 0 ?               <div className="empty">No fruits match your filters yet. Try clearing the search, or register a fruit type above.</div> : list.map((f) => (
              <TiltCard className={`fruit-card glass-card ${String(editingId) === String(f.id) ? "row-editing" : ""}`} key={f.id} max={6}>
                <div className="fruit-photo"><img src={FRUIT_IMAGES[f.name] || DEFAULT_PRODUCE_IMAGE} alt={f.name} loading="lazy" /></div>
                <div className="fruit-body">
                  <div className="row"><strong>{f.name}</strong><span className={`pill ${f.status === "Available" ? "ok" : f.status === "Seasonal" ? "warn" : "danger"}`}>{f.status}</span></div>
                  {f.description ? <p className="sub">{f.description}</p> : null}
                  <div className="size-grid" style={{marginTop:4}}>
                    {SIZES.map((sz) => {
                      const qty = getStockQty(data, f.id, sz);
                      const a = availability(qty);
                      return (
                        <div key={sz} className="size-tile">
                          <span className="size-label">{sz} box</span>
                          <span className="size-value">M {PRICE_LIST[f.name]?.[sz] ?? "-"}</span>
                          <span className={`pill ${a.tone}`}>{a.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="actions"><button type="button" className="btn sm ghost" onClick={()=>edit(f)}>Edit</button><button type="button" className="btn sm danger" onClick={()=>del(f.id)}>Delete</button></div>
                </div>
              </TiltCard>
            ))}
          </div>
        </SpotlightCard>
      </FadeIn>
    </div>
  );
}

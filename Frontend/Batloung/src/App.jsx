import { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Suppliers from "./pages/Suppliers";
import Fruits from "./pages/Fruits";
import Stock from "./pages/Stock";
import Vendors from "./pages/Vendors";
import Purchases from "./pages/Purchases";
import Sales from "./pages/Sales";
import Payments from "./pages/Payments";
import Reports from "./pages/Reports";
import { useFarm } from "./utils/FarmContext";

function GlobalBanner() {
  const { loading, error, refresh } = useFarm();
  if (loading) return <div className="container" style={{paddingTop:10}}><div className="note-box">Connecting to the farm system and loading your data...</div></div>;
  if (error) return (
    <div className="container" style={{paddingTop:10}}>
      <div className="alert error" style={{display:"flex", justifyContent:"space-between", gap:12, alignItems:"center", flexWrap:"wrap"}}>
        <span>{error}</span>
        <button className="btn sm ghost" onClick={() => refresh(true)}>Retry</button>
      </div>
    </div>
  );
  return null;
}

const pageMeta = {
  "/": { title: "Dashboard", sub: "Your farm at a glance" },
  "/suppliers": { title: "Suppliers", sub: "Fruit supply partners across South Africa" },
  "/fruits": { title: "Fruits", sub: "Manage the produce types you distribute" },
  "/stock": { title: "Stock", sub: "Live levels for every fruit and box size" },
  "/vendors": { title: "Vendors", sub: "Street vendors and small retailers in Lesotho" },
  "/purchases": { title: "Purchases", sub: "Record incoming stock from suppliers" },
  "/sales": { title: "Sales", sub: "Record sales and keep stock accurate" },
  "/payments": { title: "Payments", sub: "Track paid, partial and outstanding balances" },
  "/reports": { title: "Reports", sub: "Sales, stock and vendor insights" },
};

const currentYear = new Date().getFullYear();

const todayLabel = new Intl.DateTimeFormat("en-GB", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
}).format(new Date());

function WorkspaceHeader({ onMenuToggle }) {
  const { pathname } = useLocation();
  const meta = pageMeta[pathname] || pageMeta["/"];

  return (
    <header className="workspace-header">
      <div className="workspace-heading">
        <button className="mobile-nav-trigger" type="button" aria-label="Open navigation" onClick={onMenuToggle}>
          <span />
          <span />
          <span />
        </button>
        <div className="workspace-title">
          <h1>{meta.title}</h1>
          <p className="workspace-sub">{meta.sub}</p>
        </div>
      </div>
      <div className="workspace-meta">
        <span className="workspace-date">{todayLabel}</span>
      </div>
    </header>
  );
}

export default function App() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="app-shell">
      <Navbar mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
      <div className="app-body">
        <WorkspaceHeader onMenuToggle={() => setMobileNavOpen(true)} />
        <GlobalBanner />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/fruits" element={<Fruits />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="site-footer">
          <div className="footer-inner">
            <span className="footer-brand">Batloung Farm | Fresh produce distribution · Maseru, Lesotho</span>
            <span>© {currentYear} Batloung Farm Distribution. All rights reserved.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
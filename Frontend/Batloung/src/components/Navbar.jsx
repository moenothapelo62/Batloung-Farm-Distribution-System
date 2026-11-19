import { useState } from "react";
import { NavLink } from "react-router-dom";

const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=96&q=70`;

const groups = [
  {
    label: "Overview",
    links: [
      { to: "/", label: "Dashboard", image: photo("photo-1460925895917-afdab827c52f"), end: true },
    ],
  },
  {
    label: "Farm management",
    links: [
      { to: "/suppliers", label: "Suppliers", image: photo("photo-1500937386664-56d1dfef3854") },
      { to: "/fruits", label: "Fruits", image: photo("photo-1610832958506-aa56368176cf") },
      { to: "/stock", label: "Stock", image: photo("photo-1595855759920-86582396756a") },
      { to: "/vendors", label: "Vendors", image: photo("photo-1542838132-92c53300491e") },
    ],
  },
  {
    label: "Transactions",
    links: [
      { to: "/purchases", label: "Purchases", image: photo("photo-1586528116311-ad8dd3c8310d") },
      { to: "/sales", label: "Sales", image: photo("photo-1488459716781-31db52582fe9") },
      { to: "/payments", label: "Payments", image: photo("photo-1554224155-6726b3ff858f") },
    ],
  },
  {
    label: "Insights",
    links: [
      { to: "/reports", label: "Reports", image: photo("photo-1551288049-bebda4e38f71") },
    ],
  },
];

export default function Navbar({ mobileOpen, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {mobileOpen && <button className="nav-scrim" type="button" aria-label="Close navigation" onClick={onNavigate} />}
      <aside className={`side-nav${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`} aria-label="Main navigation">
        <div className="side-nav-top">
          <NavLink to="/" className="brand side-brand" onClick={onNavigate}>
            <img className="brand-mark" src="/batloung-logo.svg" alt="" />
            <span className="brand-text">
              <span className="brand-name">Batloung Farm</span>
              <span className="brand-sub">Fresh produce distribution</span>
            </span>
          </NavLink>
          <button
            type="button"
            className="nav-collapse-toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>
        <nav className="side-links">
          {groups.map((group) => (
            <div className="side-nav-group" key={group.label}>
              <span className="side-nav-caption">{group.label}</span>
              {group.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  title={collapsed ? link.label : undefined}
                  onClick={onNavigate}
                  className={({ isActive }) => `side-item ${isActive ? "active" : ""}`}
                >
                  <span className="side-icon">
                    <img className="side-icon-img" src={link.image} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className="side-item-label">{link.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="side-nav-footer">
          <span className="side-status-dot" />
          <span>Farm operations <small>Maseru, Lesotho</small></span>
        </div>
      </aside>
    </>
  );
}

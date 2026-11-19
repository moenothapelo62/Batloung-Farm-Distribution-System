import { useEffect, useRef, useState } from "react";

export function CountUp({ value, duration = 900, prefix = "", suffix = "" }) {
  const num = Number(String(value).replace(/[^0-9.-]/g, "")) || 0;
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const start = fromRef.current;
    const diff = num - start;
    const t0 = performance.now();
    let raf;
    const step = (t) => {
      const p = Math.min(1, Math.max(0, (t - t0) / duration));
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * e));
      if (p < 1) raf = requestAnimationFrame(step);
      else fromRef.current = num;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [num, duration]);
  return <span>{prefix}{Number(display).toLocaleString()}{suffix}</span>;
}

export function SpotlightCard({ children, className = "", style }) {
  return <div className={`spotlight-card ${className}`} style={style}>{children}</div>;
}

export function TiltCard({ children, className = "", style }) {
  return <div className={`tilt-card ${className}`} style={style}>{children}</div>;
}

export function ShinyText({ children, className = "" }) {
  return <span className={`shiny-text ${className}`}>{children}</span>;
}

export function GradientText({ children, className = "" }) {
  return <span className={`gradient-text ${className}`}>{children}</span>;
}

export function BlurText({ text, className = "", delay = 0 }) {
  return (
    <span className={`blur-text ${className}`} aria-label={text}>
      {text.split("").map((ch, i) => (
        <span key={i} className="blur-char" style={{ animationDelay: `${delay + i * 18}ms` }}>
          {ch === " " ? "\u00A0" : ch}
        </span>
      ))}
    </span>
  );
}

export function FadeIn({ children, delay = 0, className = "" }) {
  return <div className={`fade-in ${className}`} style={{ animationDelay: `${delay}ms` }}>{children}</div>;
}

export function ScaleIn({ children, delay = 0, className = "" }) {
  return <div className={`scale-in ${className}`} style={{ animationDelay: `${delay}ms` }}>{children}</div>;
}

export function Magnet({ children, className = "" }) {
  return <div className={`magnet ${className}`}>{children}</div>;
}

export function GlassCard({ children, className = "", style }) {
  return <div className={`glass-card ${className}`} style={style}>{children}</div>;
}

export function StarBorder({ children, className = "", color = "#3ddc97" }) {
  return (
    <div className={`star-border ${className}`} style={{ "--star-color": color }}>
      <div className="star-border-glow" />
      <div className="star-border-inner">{children}</div>
    </div>
  );
}

export function AnimatedList({ items = [], renderItem, className = "" }) {
  return (
    <div className={`animated-list ${className}`}>
      {items.map((item, i) => (
        <div key={item.id ?? i} className="animated-list-item" style={{ animationDelay: `${i * 40}ms` }}>
          {renderItem(item, i)}
        </div>
      ))}
    </div>
  );
}

export function FilterChips({ options, value, onChange, className = "" }) {
  return (
    <div className={`filter-chips ${className}`}>
      {options.map((opt) => {
        const v = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        return (
          <button
            key={v}
            type="button"
            className={`chip ${value === v ? "active" : ""}`}
            onClick={() => onChange(v)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

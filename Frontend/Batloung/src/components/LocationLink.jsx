import { useRef, useState } from "react";
import { directionsUrl, estimateTravel, resolveDestination, formatDuration, formatKm } from "../utils/travel";

/**
 * LocationLink opens Google Maps directions to the EXACT place, routed from
 * the visitor's current location (Google then shows real time + distance).
 *
 * The address is geocoded first (street -> city fallback) and passed to Google
 * as coordinates, so Google always places an exact pin instead of returning
 * "Google Maps can't find ..." for raw address text. An in-app travel
 * time/distance estimate is shown as a chip next to the link.
 */
export default function LocationLink({ address, children, className = "map-link" }) {
  const [eta, setEta] = useState(null);
  const [state, setState] = useState("idle"); // idle | loading | ready | unavailable
  const [href, setHref] = useState(() => directionsUrl(String(address || "").trim()));
  const resolving = useRef(null);
  const measuring = useRef(false);

  const query = String(address || "").trim();

  // Resolve address -> exact coordinates (cached), keep href in sync
  const resolve = () => {
    if (!resolving.current) {
      resolving.current = resolveDestination(query)
        .then((dest) => {
          if (dest) setHref(directionsUrl(dest));
          return dest;
        })
        .catch(() => null);
    }
    return resolving.current;
  };

  // Travel time + distance chip (needs browser location permission)
  const measure = () => {
    if (measuring.current || !query) return;
    measuring.current = true;
    setState("loading");
    estimateTravel(query)
      .then((res) => {
        if (!res) return setState("unavailable");
        if (res.unavailable) return setState("unavailable");
        setEta(res);
        setState("ready");
      })
      .catch(() => setState("unavailable"));
  };

  const open = async (e) => {
    e.preventDefault();
    const dest = await resolve();
    const url = dest ? directionsUrl(dest) : directionsUrl(query);
    window.open(url, "_blank", "noopener,noreferrer");
    measure();
  };

  if (!query) return <span className="sub">-</span>;

  return (
    <span className="location-link">
      <a
        className={className}
        href={href}
        target="_blank"
        rel="noreferrer"
        title={`Directions to ${query} from your location`}
        onMouseEnter={() => { resolve(); measure(); }}
        onFocus={() => { resolve(); measure(); }}
        onClick={open}
      >
        {children}
      </a>
      {state === "loading" && <span className="route-eta route-loading">Measuring route…</span>}
      {state === "ready" && eta && (
        <span className="route-eta" title="Estimated from your current location">
          {eta.seconds != null ? formatDuration(eta.seconds) : "≈ no route data"}
          {eta.seconds != null && " · "}
          {eta.straight ? `${formatKm(eta.km)} straight line` : formatKm(eta.km)}
        </span>
      )}
    </span>
  );
}

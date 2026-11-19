import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { suppliersApi, fruitsApi, vendorsApi, stockApi, purchasesApi, salesApi, getErrorMessage } from "../services/api";
import { compute, mapSupplier, mapFruit, mapVendor, mapStock, mapPurchase, mapSale } from "./store";

const emptyData = { suppliers: [], fruits: [], vendors: [], stock: [], purchases: [], sales: [] };
const FarmContext = createContext(null);

function dedupeById(list, key = "id") {
  const seen = new Set();
  const out = [];
  for (const item of list || []) {
    const k = item?.[key];
    const id = k === undefined || k === null ? undefined : String(k);
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    out.push(item);
  }
  return out;
}

function dedupeStock(list) {
  const seen = new Set();
  const out = [];
  for (const item of list || []) {
    const k = `${item?.fruitId}|${item?.packagingSize}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

export function FarmProvider({ children }) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    try {
      setError("");
      const [suppliers, fruits, vendors, stock, purchases, sales] = await Promise.all([
        suppliersApi.list(),
        fruitsApi.list(),
        vendorsApi.list(),
        stockApi.list(),
        purchasesApi.list(),
        salesApi.list(),
      ]);
      setData({
        suppliers: dedupeById((Array.isArray(suppliers) ? suppliers : []).map(mapSupplier)),
        fruits: dedupeById((Array.isArray(fruits) ? fruits : []).map(mapFruit)),
        vendors: dedupeById((Array.isArray(vendors) ? vendors : []).map(mapVendor)),
        stock: dedupeStock((Array.isArray(stock) ? stock : []).map(mapStock)),
        purchases: dedupeById((Array.isArray(purchases) ? purchases : []).map(mapPurchase)),
        sales: dedupeById((Array.isArray(sales) ? sales : []).map(mapSale)),
      });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => refresh(false));
  }, [refresh]);

  const value = useMemo(() => ({
    data,
    setData,
    stats: compute(data),
    loading,
    error,
    refreshing,
    refresh,
  }), [data, loading, error, refreshing, refresh]);

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) throw new Error("useFarm must be used within FarmProvider");
  return ctx;
}

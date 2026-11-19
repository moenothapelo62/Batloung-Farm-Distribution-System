export const PROVINCES = ["Gauteng", "Free State", "KwaZulu-Natal", "Western Cape", "Eastern Cape", "Limpopo", "Mpumalanga", "North West"];
export const FRUIT_NAMES = ["Apple", "Banana", "Orange", "Mango", "Grape"];
export const SIZES = ["small", "medium", "large"];
export const PAYMENT_STATUSES = ["PAID", "PARTIALLY_PAID", "UNPAID"];
export const PAYMENT_METHODS = ["Cash", "Mobile Money", "Credit"];

export const PRICE_LIST = {
  Apple:  { small: 25, medium: 45, large: 70 },
  Banana: { small: 20, medium: 35, large: 55 },
  Orange: { small: 22, medium: 40, large: 65 },
  Mango:  { small: 30, medium: 50, large: 80 },
  Grape:  { small: 28, medium: 48, large: 75 },
};

export const FRUIT_IMAGES = {
  Apple: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80",
  Banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=600&q=80",
  Orange: "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=600&q=80",
  Mango: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=600&q=80",
  Grape: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=600&q=80",
};
export const DEFAULT_PRODUCE_IMAGE = "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=600&q=80";

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const money = (n) => `M ${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const toId = (v) => (v === "" || v === null || v === undefined ? "" : Number(v));

export function normalizeDate(d) {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  try { return new Date(d).toISOString().slice(0, 10); } catch { return String(d).slice(0, 10); }
}

export function mapSupplier(s = {}) {
  return {
    id: s.supplier_id,
    businessName: s.business_name || "",
    contactPerson: s.contact_person || "",
    phone: s.phone || "",
    province: s.province || PROVINCES[0],
    address: s.address || "",
  };
}

export function mapFruit(f = {}) {
  return {
    id: f.fruit_id,
    name: f.fruit_name || "",
    description: f.description || "",
    status: f.status || "Available",
  };
}

export function mapVendor(v = {}) {
  return {
    id: v.vendor_id,
    name: v.vendor_name || "",
    phone: v.phone_number || "",
    location: v.location || "",
    registrationDate: normalizeDate(v.registration_date),
  };
}

export function mapStock(row = {}) {
  return {
    id: row.stock_id ?? `${row.fruit_id}-${row.packaging_size}`,
    fruitId: row.fruit_id,
    name: row.fruit_name || "",
    packagingSize: row.packaging_size,
    quantity: Number(row.available_quantity ?? 0),
  };
}

export function mapPurchase(p = {}) {
  return {
    id: p.purchase_id,
    supplierId: p.supplier_id,
    supplierName: p.supplier_name || "",
    date: normalizeDate(p.purchase_date),
    totalAmount: Number(p.total_amount || 0),
    items: (p.items || []).map((it) => ({
      id: it.purchase_detail_id,
      fruitId: it.fruit_id,
      fruitName: it.fruit_name || "",
      packagingSize: it.packaging_size,
      quantity: Number(it.quantity || 0),
      unitCost: Number(it.unit_cost || 0),
    })),
  };
}

export function mapSale(s = {}) {
  const total = Number(s.total_amount || 0);
  const paid = Number(s.paid_amount || 0);
  return {
    id: s.sale_id,
    vendorId: s.vendor_id,
    vendorName: s.vendor_name || "",
    date: normalizeDate(s.sale_date),
    paymentStatus: s.payment_status || "UNPAID",
    paymentMethod: s.payment_method || "Cash",
    totalAmount: total,
    paidAmount: paid,
    outstanding: Number(s.outstanding_balance ?? (total - paid)),
    items: (s.items || []).map((it) => ({
      id: it.sales_detail_id,
      fruitId: it.fruit_id,
      fruitName: it.fruit_name || "",
      packagingSize: it.packaging_size,
      quantity: Number(it.quantity || 0),
      unitPrice: Number(it.unit_price || 0),
    })),
  };
}

export function fruitName(data, id) { return data.fruits.find((f) => String(f.id) === String(id))?.name || "Unknown"; }
export function vendorName(data, id) { return data.vendors.find((v) => String(v.id) === String(id))?.name || "Unknown"; }
export function supplierName(data, id) { return data.suppliers.find((s) => String(s.id) === String(id))?.businessName || "Unknown"; }

export function getStockQty(data, fruitId, size) {
  const row = data.stock.find((s) => String(s.fruitId) === String(fruitId) && s.packagingSize === size);
  return row ? Number(row.quantity) : 0;
}

export function vendorOutstanding(data, vendorId) {
  return data.sales
    .filter((s) => String(s.vendorId) === String(vendorId))
    .reduce((sum, s) => sum + (Number(s.totalAmount) - Number(s.paidAmount || 0)), 0);
}

export function compute(data) {
  const salesTotal = data.sales.reduce((a, s) => a + Number(s.totalAmount || 0), 0);
  const received = data.sales.reduce((a, s) => a + Number(s.paidAmount || 0), 0);
  const outstanding = data.sales.reduce((a, s) => a + (Number(s.totalAmount) - Number(s.paidAmount || 0)), 0);
  const purchaseTotal = data.purchases.reduce((a, p) => a + Number(p.totalAmount || 0), 0);
  const stockQty = data.stock.reduce((a, s) => a + Number(s.quantity || 0), 0);
  const lowStock = data.stock.filter((s) => Number(s.quantity) <= 10);
  return { salesTotal, received, outstanding, purchaseTotal, stockQty, lowStock };
}

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.DEV ? "/api" : import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

export const getErrorMessage = (err) => {
  const status = err?.response?.status;
  if (status === 502) return "The backend couldn't be reached (502). In the Backend folder, run npm start and make sure MySQL is running, then try again.";
  if (status === 503 || status === 504) return `The backend didn't respond (${status}). Check that the server and MySQL are running, then try again.`;
  if (status >= 500) return `The server ran into a problem (${status}). Please try again in a moment.`;
  if (err?.code === "ECONNABORTED") return "The request timed out. Check that the backend and MySQL are running, then try again.";
  if (!err?.response && err?.message === "Network Error") return "We couldn't reach the backend. In the Backend folder, run npm start and check the MySQL connection.";
  return err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "Something went wrong";
};

const unwrap = (p) => p.then((r) => r.data);

export const suppliersApi = {
  list: () => unwrap(api.get("/suppliers")),
  get: (id) => unwrap(api.get(`/suppliers/${id}`)),
  create: (body) => unwrap(api.post("/suppliers", body)),
  update: (id, body) => unwrap(api.put(`/suppliers/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/suppliers/${id}`)),
};

export const fruitsApi = {
  list: () => unwrap(api.get("/fruits")),
  get: (id) => unwrap(api.get(`/fruits/${id}`)),
  create: (body) => unwrap(api.post("/fruits", body)),
  update: (id, body) => unwrap(api.put(`/fruits/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/fruits/${id}`)),
  stock: (id) => unwrap(api.get(id ? `/fruits/${id}/stock` : "/fruits/stock")),
  lowStock: (threshold = 10) => unwrap(api.get("/fruits/low-stock", { params: { threshold } })),
};

export const vendorsApi = {
  list: (search = "") => unwrap(api.get("/vendors", { params: search ? { search } : {} })),
  get: (id) => unwrap(api.get(`/vendors/${id}`)),
  create: (body) => unwrap(api.post("/vendors", body)),
  update: (id, body) => unwrap(api.put(`/vendors/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/vendors/${id}`)),
  balances: () => unwrap(api.get("/vendors/balances")),
  balance: (id) => unwrap(api.get(`/vendors/${id}/balance`)),
};

export const stockApi = {
  list: () => unwrap(api.get("/stock")),
  low: (threshold = 10) => unwrap(api.get("/stock/low", { params: { threshold } })),
};

export const purchasesApi = {
  list: () => unwrap(api.get("/purchases")),
  get: (id) => unwrap(api.get(`/purchases/${id}`)),
  create: (body) => unwrap(api.post("/purchases", body)),
};

export const salesApi = {
  list: () => unwrap(api.get("/sales")),
  get: (id) => unwrap(api.get(`/sales/${id}`)),
  create: (body) => unwrap(api.post("/sales", body)),
  unpaid: () => unwrap(api.get("/sales/unpaid")),
};

export const paymentsApi = {
  allSales: () => unwrap(api.get("/payments")),
  outstanding: () => unwrap(api.get("/payments/outstanding")),
  balances: () => unwrap(api.get("/payments/balances")),
  balance: (id) => unwrap(api.get(`/payments/balances/${id}`)),
  record: (body) => unwrap(api.post("/payments", body)),
};

export const reportsApi = {
  summary: () => unwrap(api.get("/reports/summary")),
  topFruits: () => unwrap(api.get("/reports/top-fruits")),
  revenue: (start, end) => unwrap(api.get("/reports/revenue", { params: { start, end } })),
  topVendor: () => unwrap(api.get("/reports/top-vendor")),
  stockLevels: () => unwrap(api.get("/reports/stock-levels")),
};

export default api;

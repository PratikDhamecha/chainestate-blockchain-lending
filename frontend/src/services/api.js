import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || "http://localhost:5000/api",
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const addr = localStorage.getItem("walletAddress");
  if (addr) config.headers["x-wallet-address"] = addr;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error || err.message || "Network error";
    return Promise.reject(new Error(msg));
  }
);

export const loansApi = {
  getAll:  (params = {}) => api.get("/loans", { params }),
  getOne:  (id)           => api.get(`/loans/${id}`),
  getStats:()             => api.get("/loans/stats"),
  create:  (body)         => api.post("/loans", body),
  fund:    (id, body)     => api.patch(`/loans/${id}/fund`, body),
  payEMI:  (id, body)     => api.patch(`/loans/${id}/emi`, body),
  seize:   (id, body)     => api.patch(`/loans/${id}/seize`, body),
};

export const propertiesApi = {
  getAll: ()          => api.get("/properties"),
  getOne: (id)        => api.get(`/properties/${id}`),
  create: (body)      => api.post("/properties", body),
  lock:   (id, delta) => api.patch(`/properties/${id}/lock`, { delta }),
};

export const txApi = {
  getAll: (params = {}) => api.get("/transactions", { params }),
};

export const kycApi = {
  getStatus:  (wallet)         => api.get(`/kyc/status/${wallet}`),
  submit:     (formData)       => api.post("/kyc/submit", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  getPending: ()               => api.get("/kyc/pending"),
  approve:    (wallet)         => api.patch(`/kyc/approve/${wallet}`),
  reject:     (wallet, reason) => api.patch(`/kyc/reject/${wallet}`, { reason }),
};

export const healthApi = { check: () => api.get("/health") };

export default api;

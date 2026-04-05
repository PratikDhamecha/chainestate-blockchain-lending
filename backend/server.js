require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const morgan     = require("morgan");
const mongoose   = require("mongoose");
const path       = require("path");

const loanRoutes     = require("./routes/loans");
const propertyRoutes = require("./routes/properties");
const txRoutes       = require("./routes/transactions");
const kycRoutes      = require("./routes/kyc");

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());
app.use(morgan("dev"));

// Serve uploaded KYC files (add auth middleware in production)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/loans",        loanRoutes);
app.use("/api/properties",   propertyRoutes);
app.use("/api/transactions", txRoutes);
app.use("/api/kyc",          kycRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

// ── DB + Start ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((err) => { console.error("❌ MongoDB error:", err.message); process.exit(1); });

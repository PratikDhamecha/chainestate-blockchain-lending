const mongoose = require("mongoose");

const kycSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String, required: true,
      unique: true, lowercase: true,
    },

    // ── Personal Info ─────────────────────────────────────────────────────────
    fullName:      { type: String, required: true },
    aadhaarNumber: { type: String, required: true }, // store encrypted in production
    panNumber:     { type: String, default: "" },

    // ── File paths (stored on server / cloud storage) ─────────────────────────
    aadhaarImagePath: { type: String, default: "" }, // path to uploaded Aadhaar image
    selfiePath:       { type: String, default: "" }, // path to selfie photo

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
    },

    rejectionReason: { type: String, default: "" },

    // ── On-chain reference ────────────────────────────────────────────────────
    submitTxHash:  { type: String, default: "" }, // submitKYC() tx
    approveTxHash: { type: String, default: "" }, // approveKYC() tx
  },
  { timestamps: true }
);

module.exports = mongoose.model("KYC", kycSchema);

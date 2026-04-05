const express  = require("express");
const router   = express.Router();
const multer   = require("multer");
const path     = require("path");
const fs       = require("fs");
const KYC      = require("../models/KYC");
const { wallet, loanContract } = require("../services/blockchain");
const { ethers } = require("ethers");

// ── KYC Registry ABI (add to blockchain.js as well) ──────────────────────────
const KYC_ABI = [
  "function submitKYC(string calldata kycId) external",
  "function approveKYC(address wallet) external",
  "function rejectKYC(address wallet) external",
  "function isVerified(address wallet) external view returns (bool)",
  "function getStatus(address wallet) external view returns (uint8)",
];

function getKYCContract() {
  return new ethers.Contract(
    process.env.KYC_CONTRACT_ADDRESS,
    KYC_ABI,
    wallet  // admin wallet from blockchain.js
  );
}

// ── Multer — file upload config ───────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../uploads/kyc");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const wallet  = req.body.walletAddress || "unknown";
    const clean   = wallet.replace(/[^a-z0-9]/gi, "").slice(0, 12);
    const ext     = path.extname(file.originalname);
    cb(null, `${clean}_${file.fieldname}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg"];
  allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only JPEG/PNG allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ── GET /api/kyc/status/:wallet ───────────────────────────────────────────────
router.get("/status/:wallet", async (req, res, next) => {
  try {
    const kyc = await KYC.findOne({ walletAddress: req.params.wallet.toLowerCase() });
    if (!kyc) return res.json({ success: true, data: { status: "NOT_SUBMITTED" } });

    // Also check on-chain status
    const kycContract  = getKYCContract();
    const onChainVerified = await kycContract.isVerified(req.params.wallet);

    res.json({
      success: true,
      data: {
        status:          kyc.status,
        onChainVerified,
        fullName:        kyc.fullName,
        submittedAt:     kyc.createdAt,
        verifiedAt:      kyc.updatedAt,
        rejectionReason: kyc.rejectionReason,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/kyc/submit ──────────────────────────────────────────────────────
// Fields: walletAddress, fullName, aadhaarNumber, panNumber (optional)
// Files:  aadhaarImage, selfie
router.post(
  "/submit",
  upload.fields([
    { name: "aadhaarImage", maxCount: 1 },
    { name: "selfie",       maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const { walletAddress, fullName, aadhaarNumber, panNumber } = req.body;

      if (!walletAddress || !fullName || !aadhaarNumber) {
        return res.status(400).json({ error: "walletAddress, fullName and aadhaarNumber are required" });
      }
      if (!req.files?.aadhaarImage || !req.files?.selfie) {
        return res.status(400).json({ error: "Both aadhaarImage and selfie are required" });
      }

      // Check if already verified
      const existing = await KYC.findOne({ walletAddress: walletAddress.toLowerCase() });
      if (existing?.status === "VERIFIED") {
        return res.status(400).json({ error: "Wallet already KYC verified" });
      }

      const aadhaarImagePath = req.files.aadhaarImage[0].path;
      const selfiePath       = req.files.selfie[0].path;

      // Upsert KYC record
      const kyc = await KYC.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        {
          walletAddress:    walletAddress.toLowerCase(),
          fullName,
          aadhaarNumber,    // 🔐 encrypt this in production with bcrypt/crypto
          panNumber:        panNumber || "",
          aadhaarImagePath,
          selfiePath,
          status:           "PENDING",
          rejectionReason:  "",
        },
        { upsert: true, new: true }
      );

      // Call submitKYC on-chain with the MongoDB _id as reference
      const kycContract = getKYCContract();
      const tx = await kycContract.submitKYC(kyc._id.toString());
      const receipt = await tx.wait();

      await KYC.findByIdAndUpdate(kyc._id, { submitTxHash: receipt.hash });

      res.status(201).json({
        success: true,
        data: { status: "PENDING", kycId: kyc._id, txHash: receipt.hash },
      });
    } catch (err) { next(err); }
  }
);

// ── PATCH /api/kyc/approve/:wallet  (admin only) ──────────────────────────────
router.patch("/approve/:wallet", async (req, res, next) => {
  try {
    const walletAddr = req.params.wallet.toLowerCase();
    const kyc = await KYC.findOne({ walletAddress: walletAddr });
    if (!kyc)               return res.status(404).json({ error: "KYC record not found" });
    if (kyc.status !== "PENDING") return res.status(400).json({ error: "KYC is not pending" });

    // Call approveKYC on-chain
    const kycContract = getKYCContract();
    const tx      = await kycContract.approveKYC(req.params.wallet);
    const receipt = await tx.wait();

    await KYC.findByIdAndUpdate(kyc._id, {
      status:        "VERIFIED",
      approveTxHash: receipt.hash,
    });

    res.json({ success: true, data: { status: "VERIFIED", txHash: receipt.hash } });
  } catch (err) { next(err); }
});

// ── PATCH /api/kyc/reject/:wallet  (admin only) ───────────────────────────────
router.patch("/reject/:wallet", async (req, res, next) => {
  try {
    const { reason } = req.body;
    const walletAddr = req.params.wallet.toLowerCase();

    const kyc = await KYC.findOne({ walletAddress: walletAddr });
    if (!kyc) return res.status(404).json({ error: "KYC record not found" });

    const kycContract = getKYCContract();
    const tx      = await kycContract.rejectKYC(req.params.wallet);
    const receipt = await tx.wait();

    await KYC.findByIdAndUpdate(kyc._id, {
      status:          "REJECTED",
      rejectionReason: reason || "Does not meet requirements",
    });

    res.json({ success: true, data: { status: "REJECTED", txHash: receipt.hash } });
  } catch (err) { next(err); }
});

// ── GET /api/kyc/pending  (admin — list all pending) ─────────────────────────
router.get("/pending", async (req, res, next) => {
  try {
    const list = await KYC.find({ status: "PENDING" }).sort({ createdAt: 1 });
    res.json({ success: true, data: list });
  } catch (err) { next(err); }
});

module.exports = router;

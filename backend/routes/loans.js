const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
const Loan = require("../models/Loan");
const Transaction = require("../models/Transaction");
const { loanContract, propertyContract, getChainLoan } = require("../services/blockchain");

// ── GET /api/loans  — list all loans (optionally filter by status/borrower/lender)
router.get("/", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status)   filter.status   = req.query.status.toUpperCase();
    if (req.query.borrower) filter.borrower = req.query.borrower.toLowerCase();
    if (req.query.lender)   filter.lender   = req.query.lender.toLowerCase();

    const loans = await Loan.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: loans });
  } catch (err) { next(err); }
});

// ── GET /api/loans/stats  — dashboard numbers
router.get("/stats", async (req, res, next) => {
  try {
    const [total, active, closed, defaulted, requested] = await Promise.all([
      Loan.countDocuments(),
      Loan.countDocuments({ status: "ACTIVE" }),
      Loan.countDocuments({ status: "CLOSED" }),
      Loan.countDocuments({ status: "DEFAULTED" }),
      Loan.countDocuments({ status: "REQUESTED" }),
    ]);

    // Sum principal of active + funded loans as TVL approximation
    const activeLoanDocs = await Loan.find({ status: { $in: ["ACTIVE", "FUNDED"] } });
    const tvlWei = activeLoanDocs.reduce((sum, l) => sum + BigInt(l.principal || "0"), 0n);
    const tvlEth = ethers.formatEther(tvlWei);

    res.json({ success: true, data: { total, active, closed, defaulted, requested, tvlEth } });
  } catch (err) { next(err); }
});

// ── GET /api/loans/:id  — single loan
router.get("/:id", async (req, res, next) => {
  try {
    const loan = await Loan.findOne({ loanId: req.params.id });
    if (!loan) return res.status(404).json({ error: "Loan not found" });
    res.json({ success: true, data: loan });
  } catch (err) { next(err); }
});

// ── POST /api/loans  — record a new loan request (called after requestLoan tx)
//    Body: { borrower, propertyId, lockedShares, principal, interest, emiCount, durationPerEMI, txHash }
router.post("/", async (req, res, next) => {
  try {
    const { borrower, propertyId, lockedShares, principal, interest, emiCount, durationPerEMI, txHash } = req.body;

    // Fetch the new loanId from the contract
    const loanId = Number(await loanContract.loanCounter());
    const total  = BigInt(principal) + BigInt(interest);
    const emiAmount   = (total / BigInt(emiCount)).toString();
    const sharesPerEMI = Math.floor(lockedShares / emiCount);

    const loan = await Loan.create({
      loanId,
      borrower:       borrower.toLowerCase(),
      propertyId:     Number(propertyId),
      lockedShares:   Number(lockedShares),
      principal,
      interest,
      emiCount:       Number(emiCount),
      emiAmount,
      sharesPerEMI,
      durationPerEMI: Number(durationPerEMI),
      txHash,
      status: "REQUESTED",
    });

    await Transaction.create({
      event: "LoanRequested",
      loanId,
      from:  borrower.toLowerCase(),
      to:    process.env.LOAN_CONTRACT_ADDRESS?.toLowerCase(),
      value: "0",
      txHash,
    });

    res.status(201).json({ success: true, data: loan });
  } catch (err) { next(err); }
});

// ── PATCH /api/loans/:id/fund  — lender funded the loan
//    Body: { lender, txHash }
router.patch("/:id/fund", async (req, res, next) => {
  try {
    const { lender, txHash } = req.body;
    const loanId = Number(req.params.id);

    // Pull nextDueDate from chain
    const chainLoan = await getChainLoan(loanId);
    const nextDueDate = new Date(chainLoan.nextDueDate * 1000);

    const loan = await Loan.findOneAndUpdate(
      { loanId },
      { lender: lender.toLowerCase(), status: "ACTIVE", nextDueDate, txHash },
      { new: true }
    );
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    await Transaction.create({
      event: "LoanFunded", loanId,
      from: lender.toLowerCase(),
      to:   loan.borrower,
      value: loan.principal,
      txHash,
    });

    res.json({ success: true, data: loan });
  } catch (err) { next(err); }
});

// ── PATCH /api/loans/:id/emi  — borrower paid an EMI
//    Body: { txHash }
router.patch("/:id/emi", async (req, res, next) => {
  try {
    const { txHash } = req.body;
    const loanId = Number(req.params.id);

    const chainLoan = await getChainLoan(loanId);
    const nextDueDate = new Date(chainLoan.nextDueDate * 1000);
    const newStatus   = chainLoan.closed ? "CLOSED" : "ACTIVE";

    const loan = await Loan.findOneAndUpdate(
      { loanId },
      { emiPaid: chainLoan.emiPaid, nextDueDate, status: newStatus },
      { new: true }
    );
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    await Transaction.create({
      event: "EMIPaid", loanId,
      from: loan.borrower,
      to:   loan.lender || "",
      value: loan.emiAmount,
      txHash,
    });

    if (newStatus === "CLOSED") {
      await Transaction.create({
        event: "LoanClosed", loanId,
        from: process.env.LOAN_CONTRACT_ADDRESS?.toLowerCase(),
        to:   loan.borrower,
        value: "0",
        txHash: txHash + "_close",
      });
    }

    res.json({ success: true, data: loan });
  } catch (err) { next(err); }
});

// ── PATCH /api/loans/:id/seize  — lender seized shares on default
//    Body: { txHash }
router.patch("/:id/seize", async (req, res, next) => {
  try {
    const { txHash } = req.body;
    const loanId = Number(req.params.id);

    const chainLoan = await getChainLoan(loanId);
    const newStatus  = chainLoan.closed ? "CLOSED" : "DEFAULTED";

    const loan = await Loan.findOneAndUpdate(
      { loanId },
      { emiPaid: chainLoan.emiPaid, lockedShares: chainLoan.lockedShares, status: newStatus },
      { new: true }
    );
    if (!loan) return res.status(404).json({ error: "Loan not found" });

    await Transaction.create({
      event: "SharesSeized", loanId,
      from: process.env.LOAN_CONTRACT_ADDRESS?.toLowerCase(),
      to:   loan.lender || "",
      value: loan.sharesPerEMI?.toString() || "0",
      txHash,
    });

    res.json({ success: true, data: loan });
  } catch (err) { next(err); }
});

module.exports = router;

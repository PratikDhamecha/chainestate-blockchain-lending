const express = require("express");
const router  = express.Router();
const Transaction = require("../models/Transaction");

// ── GET /api/transactions
router.get("/", async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.loanId) filter.loanId = Number(req.query.loanId);
    if (req.query.event)  filter.event  = req.query.event;

    const txs = await Transaction.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: txs });
  } catch (err) { next(err); }
});

module.exports = router;

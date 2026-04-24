const express = require("express");
const router = express.Router();
const loanController = require("../controllers/loanController");

// ── Fast DB Reads (No blockchain querying blocking the event loop) ──
router.get("/", loanController.getAllLoans);
router.get("/stats", loanController.getStats);
router.get("/:id", loanController.getLoanById);

/**
 * Note: POST and PATCH routes are no longer needed for state updates,
 * because the Blockchain Indexer (services/indexer.js) automatically catches
 * LoanCreated, LoanFunded, LoanActivated, and LoanRepaid events.
 * 
 * The frontend simply sends the transaction via MetaMask, and the backend
 * updates instantly in the background. 
 */

module.exports = router;

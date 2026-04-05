const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      enum: ["LoanRequested", "LoanFunded", "EMIPaid", "SharesSeized", "LoanClosed"],
      required: true,
    },
    loanId:    { type: Number, required: true },
    from:      { type: String, lowercase: true },
    to:        { type: String, lowercase: true },
    value:     { type: String },           // ETH amount or share count as string
    txHash:    { type: String, required: true, unique: true },
    blockNumber:{ type: Number },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);

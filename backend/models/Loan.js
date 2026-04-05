const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    loanId:      { type: Number, unique: true },   // from contract loanCounter
    borrower:    { type: String, required: true, lowercase: true },
    lender:      { type: String, lowercase: true, default: null },
    propertyId:  { type: Number, required: true },
    lockedShares:{ type: Number, required: true },
    principal:   { type: String, required: true }, // stored as wei string
    interest:    { type: String, required: true },
    emiCount:    { type: Number, required: true },
    emiPaid:     { type: Number, default: 0 },
    emiAmount:   { type: String },                 // (principal+interest)/emiCount
    sharesPerEMI:{ type: Number },
    durationPerEMI: { type: Number },              // seconds
    nextDueDate: { type: Date, default: null },
    txHash:      { type: String },                 // requestLoan tx
    status: {
      type: String,
      enum: ["REQUESTED", "FUNDED", "ACTIVE", "CLOSED", "DEFAULTED"],
      default: "REQUESTED",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Loan", loanSchema);

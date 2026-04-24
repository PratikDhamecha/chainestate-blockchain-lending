const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema({
    loanId: { type: Number, unique: true }, // Smart Contract ID
    borrower: { type: String, lowercase: true, index: true },
    principal: { type: String, required: true }, // Stored as wei string
    totalInterest: { type: String, required: true }, // Stored as wei string
    amountFunded: { type: String, default: "0" },
    termMonths: { type: Number, default: 12 }, // Used for EMI generation
    deadline: { type: Date },
    status: { type: String, enum: ['REQUESTED', 'FUNDING', 'ACTIVE', 'REPAID', 'DEFAULTED'], default: 'REQUESTED' }
}, { timestamps: true });

module.exports = mongoose.model("Loan", loanSchema);

const mongoose = require("mongoose");

const lenderSchema = new mongoose.Schema({
    loanId: { type: Number, index: true },
    lenderAddress: { type: String, lowercase: true, index: true },
    amountContributed: { type: String }, // Store wei as string to prevent precision loss
    hasClaimedRepayment: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Lender", lenderSchema);

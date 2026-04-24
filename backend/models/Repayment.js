const mongoose = require("mongoose");

const repaymentSchema = new mongoose.Schema({
    loanId: { type: Number, index: true },
    installmentNumber: { type: Number },
    dueDate: { type: Date },
    emiAmount: { type: Number },
    principalComponent: { type: Number },
    interestComponent: { type: Number },
    status: { type: String, enum: ['PENDING', 'PAID', 'LATE'], default: 'PENDING' },
    txHash: { type: String }
});

module.exports = mongoose.model("Repayment", repaymentSchema);

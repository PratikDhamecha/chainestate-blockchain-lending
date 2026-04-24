const Lender = require("../models/Lender");
const Loan = require("../models/Loan");

exports.getLenderPortfolio = async (req, res, next) => {
    try {
        const address = req.params.address.toLowerCase();
        
        // Find all loans this lender has contributed to
        const contributions = await Lender.find({ lenderAddress: address }).lean();
        
        // You could also aggregate data here (e.g., total active capital)
        res.json({ success: true, data: contributions });
    } catch (err) { next(err); }
};

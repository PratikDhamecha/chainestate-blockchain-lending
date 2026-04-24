const { loanContract, getChainLoan } = require("./blockchain");
const Loan = require("../models/Loan");
const Lender = require("../models/Lender");
const Repayment = require("../models/Repayment");
const { generateRepaymentSchedule } = require("../utils/emiEngine");

/**
 * startIndexer
 * Listens for on-chain events from LendingCore.sol
 */
function startIndexer() {
    console.log("✅ Starting Blockchain Event Indexer for LendingCore...");

    // Listen for New Loans
    loanContract.on("LoanCreated", async (loanId, borrower, principal) => {
        console.log(`[Event] LoanCreated: ${loanId}`);
        await Loan.findOneAndUpdate(
            { loanId: Number(loanId) },
            { borrower: borrower.toLowerCase(), principal: principal.toString(), status: 'REQUESTED' },
            { upsert: true }
        );
    });

    // Listen for Funding Events
    loanContract.on("LoanFunded", async (loanId, lender, amount) => {
        console.log(`[Event] LoanFunded: ${loanId} by ${lender}`);
        // Update Lender Contribution
        await Lender.findOneAndUpdate(
            { loanId: Number(loanId), lenderAddress: lender.toLowerCase() },
            { $inc: { amountContributed: Number(amount) } },
            { upsert: true }
        );

        // Update Loan Total
        const chainLoan = await getChainLoan(loanId);
        await Loan.findOneAndUpdate(
            { loanId: Number(loanId) },
            { amountFunded: chainLoan.amountFunded, status: 'FUNDING' }
        );
    });

    // Listen for Activation (Generate EMIs here)
    loanContract.on("LoanActivated", async (loanId) => {
        console.log(`[Event] LoanActivated: ${loanId}`);

        const chainLoan = await getChainLoan(loanId);
        const loan = await Loan.findOneAndUpdate(
            { loanId: Number(loanId) },
            {
                status: 'ACTIVE',
                deadline: new Date(chainLoan.deadline * 1000),
                remainingPrincipal: chainLoan.remainingPrincipal,
                monthlyInterestRateBP: chainLoan.monthlyInterestRateBP,
                emiAmount: chainLoan.emiAmount
            },
            { new: true }
        );

        const principalFloat = parseFloat(ethers.formatEther(chainLoan.remainingPrincipal));
        const emiFloat = parseFloat(ethers.formatEther(chainLoan.emiAmount));

        // Generate dynamic schedule
        const schedule = generateRepaymentSchedule(principalFloat, chainLoan.monthlyInterestRateBP, emiFloat);

        const repaymentDocs = schedule.map(s => ({ loanId: loan.loanId, ...s }));
        await Repayment.insertMany(repaymentDocs);
        console.log(`[Indexer] Generated ${repaymentDocs.length} EMI Repayments for Loan #${loanId}`);
    });

    // Listen for EMIPaid (Prepayments / Standard payments)
    loanContract.on("EMIPaid", async (loanId, totalPaid, principalReduction, interestPaid, event) => {
        console.log(`[Event] EMIPaid: ${loanId} - Total: ${ethers.formatEther(totalPaid)} ETH`);

        const chainLoan = await getChainLoan(loanId);

        // Update Loan doc with new remaining principal
        await Loan.findOneAndUpdate(
            { loanId: Number(loanId) },
            {
                remainingPrincipal: chainLoan.remainingPrincipal,
                status: chainLoan.status // Will be REPAID if 0
            }
        );

        // 1. Find oldest PENDING and mark it PAID with the EXACT historical event values
        const nextEMI = await Repayment.findOne({ loanId: Number(loanId), status: 'PENDING' }).sort({ installmentNumber: 1 });
        let nextInstallmentNum = 2; // Default if none found

        if (nextEMI) {
            nextInstallmentNum = nextEMI.installmentNumber + 1;
            nextEMI.status = 'PAID';
            nextEMI.emiAmount = ethers.formatEther(totalPaid);
            nextEMI.principalComponent = ethers.formatEther(principalReduction);
            nextEMI.interestComponent = ethers.formatEther(interestPaid);
            nextEMI.remainingBalance = ethers.formatEther(chainLoan.remainingPrincipal);
            if (event && event.log) nextEMI.txHash = event.log.transactionHash;
            await nextEMI.save();
        }

        // 2. Wipe remaining PENDING schedule
        await Repayment.deleteMany({ loanId: Number(loanId), status: 'PENDING' });

        // 3. Regenerate future schedule if principal > 0
        if (chainLoan.status !== "REPAID") {
            const principalFloat = parseFloat(ethers.formatEther(chainLoan.remainingPrincipal));
            const emiFloat = parseFloat(ethers.formatEther(chainLoan.emiAmount));

            const schedule = generateRepaymentSchedule(principalFloat, chainLoan.monthlyInterestRateBP, emiFloat, new Date(), nextInstallmentNum);

            if (schedule.length > 0) {
                const repaymentDocs = schedule.map(s => ({ loanId: Number(loanId), ...s }));
                await Repayment.insertMany(repaymentDocs);
                console.log(`[Indexer] Regenerated ${repaymentDocs.length} future EMIs due to prepayment on Loan #${loanId}`);
            }
        }
    });

    // Listen for Defaults
    loanContract.on("LoanDefaulted", async (loanId) => {
        console.log(`[Event] LoanDefaulted: ${loanId}`);
        await Loan.findOneAndUpdate({ loanId: Number(loanId) }, { status: 'DEFAULTED' });
    });
}

// Keep the sync function for manual triggers if needed
async function syncLoanFromChain(loanId) {
    const chainLoan = await getChainLoan(loanId);
    return await Loan.findOneAndUpdate(
        { loanId: Number(loanId) },
        {
            borrower: chainLoan.borrower.toLowerCase(),
            principal: chainLoan.principal,
            totalInterest: chainLoan.totalInterest,
            amountFunded: chainLoan.amountFunded,
            deadline: new Date(chainLoan.deadline * 1000),
            status: chainLoan.status
        },
        { new: true, upsert: true }
    );
}

module.exports = { startIndexer, syncLoanFromChain };

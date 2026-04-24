/**
 * Calculates the standard EMI based on Principal, Annual Rate, and Months.
 * Formula: E = P * r * (1 + r)^n / ((1 + r)^n - 1)
 */
function calculateEMI(principal, annualInterestRate, months) {
    if (annualInterestRate === 0) return (principal / months).toFixed(4);
    const r = annualInterestRate / 12 / 100;
    const p = parseFloat(principal);
    const n = parseInt(months);
    const emi = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return emi.toFixed(6);
}

/**
 * Generates a dynamic repayment schedule based on the exact remaining balance.
 * This supports prepayments that reduce the principal and slash future tenure.
 */
function generateRepaymentSchedule(remainingPrincipal, monthlyRateBP, emiAmount, startDate = new Date(), startInstallmentNum = 1) {
    let balance = parseFloat(remainingPrincipal);
    const r = parseFloat(monthlyRateBP) / 10000;
    const emi = parseFloat(emiAmount);

    const schedule = [];
    let currentDate = new Date(startDate);
    let i = startInstallmentNum;

    // Failsafe for negative amortization
    if (balance * r >= emi) {
        throw new Error("EMI amount is too low to cover monthly interest. Negative amortization detected.");
    }

    while (balance > 0.0001) { // Floating point safeguard
        let interestForMonth = balance * r;
        let payment = emi;

        // Final payment adjusting logic
        if (balance + interestForMonth < emi) {
            payment = balance + interestForMonth;
        }

        let principalForMonth = payment - interestForMonth;
        balance -= principalForMonth;

        currentDate = new Date(currentDate.getTime() + (30 * 24 * 60 * 60 * 1000));

        schedule.push({
            installmentNumber: i,
            dueDate: new Date(currentDate),
            emiAmount: payment.toFixed(6),
            principalComponent: principalForMonth.toFixed(6),
            interestComponent: interestForMonth.toFixed(6),
            remainingBalance: Math.max(0, balance).toFixed(6),
            status: "PENDING"
        });

        i++;
    }

    return schedule;
}

module.exports = { calculateEMI, generateRepaymentSchedule };

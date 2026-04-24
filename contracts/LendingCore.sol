// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LendingCore
 * @dev A production-grade syndicated lending protocol with advanced EMI amortization & principal reduction.
 */
contract LendingCore {

    // ─── STATE MACHINE ───────────────────────────────────────────────────────
    enum LoanStatus {
        REQUESTED, // Loan created, waiting for first funder
        FUNDING,   // Partially funded, accepting more lenders
        ACTIVE,    // Fully funded, money sent to borrower
        REPAID,    // Borrower repaid principal fully
        DEFAULTED  // Deadline missed, collateral seized
    }

    // ─── STRUCTS & MAPPINGS ──────────────────────────────────────────────────
    struct Loan {
        address borrower;
        uint256 principal;             // Target amount to raise
        uint256 remainingPrincipal;    // Updates dynamically with prepayments
        uint256 monthlyInterestRateBP; // e.g. 83 for 0.83% (10% annual)
        uint256 emiAmount;             // The minimum accepted monthly payment
        uint256 amountFunded;          // Amount collected so far
        uint256 deadline;              // Timestamp by which loan must be repaid
        LoanStatus status;
    }

    uint256 public loanCounter;
    mapping(uint256 => Loan) public loans;
    
    // Tracks individual lender contributions per loan: loanId => lenderAddress => amountFunded
    mapping(uint256 => mapping(address => uint256)) public lenderAmounts;

    // Tracks total funds repaid into the contract for a loan
    mapping(uint256 => uint256) public accumulatedRepayments;

    // Tracks how much a specific lender has already claimed
    mapping(uint256 => mapping(address => uint256)) public alreadyClaimed;

    // ─── EVENTS ──────────────────────────────────────────────────────────────
    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 principal);
    event LoanFunded(uint256 indexed loanId, address indexed lender, uint256 amount);
    event LoanActivated(uint256 indexed loanId);
    event EMIPaid(uint256 indexed loanId, uint256 totalPaid, uint256 principalReduction, uint256 interestPaid);
    event RepaymentClaimed(uint256 indexed loanId, address indexed lender, uint256 amount);
    event LoanDefaulted(uint256 indexed loanId);

    // ─── REENTRANCY GUARD (No external dependencies) ─────────────────────────
    uint256 private _status;
    modifier nonReentrant() {
        require(_status != 2, "ReentrancyGuard: reentrant call");
        _status = 2;
        _;
        _status = 1;
    }

    constructor() {
        _status = 1; // Initialize ReentrancyGuard
    }

    // ─── CORE FUNCTIONS ──────────────────────────────────────────────────────

    /**
     * @notice Borrower creates a loan request.
     * @param _principal The target ETH amount needed.
     * @param _monthlyRateBP Monthly interest rate in basis points (e.g., 83 for 0.83%)
     * @param _duration The time borrower has to repay after activation (in seconds)
     * @param _emiAmount The calculated constant EMI payment
     */
    function createLoan(uint256 _principal, uint256 _monthlyRateBP, uint256 _duration, uint256 _emiAmount) external {
        require(_principal > 0, "Principal must be > 0");
        require(_duration > 0, "Duration must be > 0");
        require(_emiAmount > 0, "EMI amount must be > 0");

        loanCounter++;
        
        loans[loanCounter] = Loan({
            borrower: msg.sender,
            principal: _principal,
            remainingPrincipal: _principal,
            monthlyInterestRateBP: _monthlyRateBP,
            emiAmount: _emiAmount,
            amountFunded: 0,
            deadline: _duration, // Temporarily stores duration until activated
            status: LoanStatus.REQUESTED
        });

        emit LoanCreated(loanCounter, msg.sender, _principal);
    }

    /**
     * @notice Lenders fund the loan. Transitions to FUNDING or ACTIVE.
     * @param loanId The ID of the loan to fund.
     */
    function fundLoan(uint256 loanId) external payable nonReentrant {
        Loan storage loan = loans[loanId];
        
        require(
            loan.status == LoanStatus.REQUESTED || loan.status == LoanStatus.FUNDING, 
            "Loan not open for funding"
        );
        require(msg.value > 0, "Must send ETH");
        
        uint256 remainingNeeded = loan.principal - loan.amountFunded;
        uint256 contribution = msg.value;

        // Prevent overfunding: refund excess ETH
        if (contribution > remainingNeeded) {
            contribution = remainingNeeded;
            uint256 excess = msg.value - remainingNeeded;
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "Refund failed");
        }

        loan.amountFunded += contribution;
        lenderAmounts[loanId][msg.sender] += contribution;

        if (loan.status == LoanStatus.REQUESTED) {
            loan.status = LoanStatus.FUNDING;
        }

        emit LoanFunded(loanId, msg.sender, contribution);

        // Auto-activate if fully funded
        if (loan.amountFunded == loan.principal) {
            _activateLoan(loanId);
        }
    }

    /**
     * @notice Internal function to activate loan once fully funded.
     * Sent ETH directly to borrower.
     */
    function _activateLoan(uint256 loanId) internal {
        Loan storage loan = loans[loanId];
        
        loan.status = LoanStatus.ACTIVE;
        loan.deadline = block.timestamp + loan.deadline; // Convert duration to timestamp
        
        // Transfer collected principal to borrower
        (bool success, ) = payable(loan.borrower).call{value: loan.principal}("");
        require(success, "Transfer to borrower failed");

        emit LoanActivated(loanId);
    }

    /**
     * @notice Borrower pays EMI, with optional prepayment reducing principal.
     * @param loanId The ID of the loan.
     */
    function payEMI(uint256 loanId) external payable nonReentrant {
        Loan storage loan = loans[loanId];
        
        require(loan.status == LoanStatus.ACTIVE, "Loan is not active");
        require(loan.remainingPrincipal > 0, "Already fully paid");
        
        // 1. Calculate Interest for this month
        uint256 interestForMonth = (loan.remainingPrincipal * loan.monthlyInterestRateBP) / 10000;
        
        // 2. Minimum accepted payment logic
        uint256 requiredMin = loan.remainingPrincipal + interestForMonth < loan.emiAmount 
            ? loan.remainingPrincipal + interestForMonth 
            : loan.emiAmount;
            
        require(msg.value >= requiredMin, "Payment below required minimum EMI");

        // 3. Process Principal Reduction
        uint256 payment = msg.value;
        uint256 principalReduction = payment - interestForMonth;

        // If borrower overpays past remaining principal, refund the excess
        if (principalReduction > loan.remainingPrincipal) {
            principalReduction = loan.remainingPrincipal;
            payment = interestForMonth + principalReduction;
            
            uint256 excess = msg.value - payment;
            (bool success, ) = payable(msg.sender).call{value: excess}("");
            require(success, "Refund of excess failed");
        }

        // 4. Update State
        loan.remainingPrincipal -= principalReduction;
        accumulatedRepayments[loanId] += payment;

        if (loan.remainingPrincipal == 0) {
            loan.status = LoanStatus.REPAID;
        }

        emit EMIPaid(loanId, payment, principalReduction, interestForMonth);
    }

    /**
     * @notice Lenders continuously claim their proportional share of accumulated repayments. O(1) Gas efficiency.
     * @param loanId The ID of the loan.
     */
    function claimRepayment(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];
        
        require(loan.status == LoanStatus.ACTIVE || loan.status == LoanStatus.REPAID, "Loan not active/repaid");
        
        uint256 myContribution = lenderAmounts[loanId][msg.sender];
        require(myContribution > 0, "No contribution found");

        // Calculate proportional entitlement of total historical repayments
        uint256 totalEntitlement = (myContribution * accumulatedRepayments[loanId]) / loan.principal;
        
        // Subtract what they've already claimed
        uint256 amountToClaim = totalEntitlement - alreadyClaimed[loanId][msg.sender];
        require(amountToClaim > 0, "Nothing to claim");

        // Mark as claimed
        alreadyClaimed[loanId][msg.sender] += amountToClaim;

        (bool success, ) = payable(msg.sender).call{value: amountToClaim}("");
        require(success, "Transfer failed");

        emit RepaymentClaimed(loanId, msg.sender, amountToClaim);
    }

    /**
     * @notice Marks the loan as defaulted if the deadline has passed.
     * @param loanId The ID of the loan.
     */
    function markDefault(uint256 loanId) external {
        Loan storage loan = loans[loanId];
        
        require(loan.status == LoanStatus.ACTIVE, "Loan is not active");
        require(block.timestamp > loan.deadline, "Deadline not passed yet");

        loan.status = LoanStatus.DEFAULTED;
        
        emit LoanDefaulted(loanId);
    }
}

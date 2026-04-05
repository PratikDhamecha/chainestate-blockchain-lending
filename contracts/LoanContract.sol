// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// Import KYC interface
interface IKYCRegistry {
    function isVerified(address wallet) external view returns (bool);
}

contract LoanContract is ReentrancyGuard, ERC1155Holder {

    IERC1155     public propertyShares;
    IKYCRegistry public kycRegistry;      // ← NEW

    uint256 public loanCounter;

    constructor(address _propertyShares, address _kycRegistry) {
        propertyShares = IERC1155(_propertyShares);
        kycRegistry    = IKYCRegistry(_kycRegistry);
    }

    event LoanRequested(uint256 indexed loanId, address indexed borrower);
    event LoanFunded   (uint256 indexed loanId, address indexed lender);
    event EMIPaid      (uint256 indexed loanId);
    event SharesSeized (uint256 indexed loanId, uint256 shares);
    event LoanClosed   (uint256 indexed loanId);

    struct Loan {
        address borrower;
        address lender;
        uint256 propertyId;
        uint256 lockedShares;
        uint256 principal;
        uint256 interest;
        uint256 emiCount;
        uint256 emiPaid;
        uint256 emiAmount;
        uint256 sharesPerEMI;
        uint256 nextDueDate;
        uint256 durationPerEMI;
        bool    funded;
        bool    closed;
    }

    mapping(uint256 => Loan) public loans;

    function _sendETH(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    // ── REQUEST LOAN — requires KYC ───────────────────────────────────────────
    function requestLoan(
        uint256 propertyId,
        uint256 sharesToLock,
        uint256 principal,
        uint256 interest,
        uint256 emiCount,
        uint256 durationPerEMI
    ) external nonReentrant {

        // KYC Check — borrower must be verified
        require(kycRegistry.isVerified(msg.sender), "KYC not verified");

        require(principal > 0,    "Invalid principal");
        require(sharesToLock > 0, "Invalid shares");
        require(emiCount > 0,     "Invalid EMI count");
        require(durationPerEMI > 0, "Invalid duration");
        require(
            propertyShares.balanceOf(msg.sender, propertyId) >= sharesToLock,
            "Not enough shares"
        );
        require(sharesToLock % emiCount == 0, "Shares must divide evenly");

        uint256 total = principal + interest;
        require(total % emiCount == 0, "EMI must divide evenly");

        loanCounter++;

        propertyShares.safeTransferFrom(
            msg.sender, address(this), propertyId, sharesToLock, ""
        );

        loans[loanCounter] = Loan({
            borrower:       msg.sender,
            lender:         address(0),
            propertyId:     propertyId,
            lockedShares:   sharesToLock,
            principal:      principal,
            interest:       interest,
            emiCount:       emiCount,
            emiPaid:        0,
            emiAmount:      total / emiCount,
            sharesPerEMI:   sharesToLock / emiCount,
            nextDueDate:    block.timestamp + durationPerEMI,
            durationPerEMI: durationPerEMI,
            funded:         false,
            closed:         false
        });

        emit LoanRequested(loanCounter, msg.sender);
    }

    // ── FUND LOAN ─────────────────────────────────────────────────────────────
    function fundLoan(uint256 loanId) external payable nonReentrant {
        Loan storage loan = loans[loanId];
        require(!loan.funded,          "Already funded");
        require(!loan.closed,          "Closed");
        require(msg.value == loan.principal, "Wrong ETH");

        loan.funded = true;
        loan.lender = msg.sender;
        _sendETH(loan.borrower, msg.value);

        emit LoanFunded(loanId, msg.sender);
    }

    // ── PAY EMI ───────────────────────────────────────────────────────────────
    function payEMI(uint256 loanId) external payable nonReentrant {
        Loan storage loan = loans[loanId];
        require(msg.sender == loan.borrower, "Not borrower");
        require(loan.funded,                 "Not funded");
        require(!loan.closed,                "Closed");
        require(block.timestamp <= loan.nextDueDate, "Missed EMI");
        require(msg.value == loan.emiAmount, "Wrong amount");

        loan.emiPaid++;
        loan.nextDueDate += loan.durationPerEMI;
        _sendETH(loan.lender, msg.value);

        emit EMIPaid(loanId);

        if (loan.emiPaid == loan.emiCount) {
            _closeLoan(loanId);
        }
    }

    // ── SEIZE SHARES ──────────────────────────────────────────────────────────
    function seizeShares(uint256 loanId) external nonReentrant {
        Loan storage loan = loans[loanId];
        require(loan.funded,                       "Not funded");
        require(!loan.closed,                      "Closed");
        require(msg.sender == loan.lender,         "Not lender");
        require(block.timestamp > loan.nextDueDate,"Not defaulted");
        require(loan.emiPaid < loan.emiCount,      "Loan finished");

        uint256 shares    = loan.sharesPerEMI;
        loan.lockedShares -= shares;
        loan.emiPaid++;
        loan.nextDueDate  += loan.durationPerEMI;

        propertyShares.safeTransferFrom(
            address(this), loan.lender, loan.propertyId, shares, ""
        );

        emit SharesSeized(loanId, shares);

        if (loan.lockedShares == 0) {
            loan.closed = true;
            emit LoanClosed(loanId);
        }
    }

    // ── INTERNAL CLOSE ────────────────────────────────────────────────────────
    function _closeLoan(uint256 loanId) internal {
        Loan storage loan = loans[loanId];
        loan.closed = true;
        if (loan.lockedShares > 0) {
            propertyShares.safeTransferFrom(
                address(this), loan.borrower,
                loan.propertyId, loan.lockedShares, ""
            );
        }
        emit LoanClosed(loanId);
    }
}

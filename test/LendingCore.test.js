const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("LendingCore Advanced EMI Model", function () {
  let LendingCore;
  let lendingCore;
  let borrower;
  let lender1;
  let lender2;
  let lender3;
  let addrs;

  // Constants for test
  const PRINCIPAL = ethers.parseEther("10.0"); // 10 ETH
  const MONTHLY_RATE_BP = 83; // 0.83% monthly
  const DURATION = 365 * 24 * 60 * 60; // 1 year
  const EMI_AMOUNT = ethers.parseEther("1.0"); // 1 ETH EMI

  beforeEach(async function () {
    [borrower, lender1, lender2, lender3, ...addrs] = await ethers.getSigners();

    LendingCore = await ethers.getContractFactory("LendingCore");
    lendingCore = await LendingCore.deploy();
    await lendingCore.waitForDeployment();
  });

  describe("Loan Creation", function () {
    it("Should successfully create a loan request", async function () {
      await expect(lendingCore.connect(borrower).createLoan(PRINCIPAL, MONTHLY_RATE_BP, DURATION, EMI_AMOUNT))
        .to.emit(lendingCore, "LoanCreated")
        .withArgs(1, borrower.address, PRINCIPAL);

      const loan = await lendingCore.loans(1);
      expect(loan.borrower).to.equal(borrower.address);
      expect(loan.principal).to.equal(PRINCIPAL);
      expect(loan.remainingPrincipal).to.equal(PRINCIPAL);
      expect(loan.monthlyInterestRateBP).to.equal(MONTHLY_RATE_BP);
      expect(loan.emiAmount).to.equal(EMI_AMOUNT);
      expect(loan.status).to.equal(0); // LoanStatus.REQUESTED
    });
  });

  describe("Syndicated Funding & Activation", function () {
    beforeEach(async function () {
      await lendingCore.connect(borrower).createLoan(PRINCIPAL, MONTHLY_RATE_BP, DURATION, EMI_AMOUNT);
    });

    it("Should allow partial funding and auto-activate when fully funded", async function () {
      const fund1 = ethers.parseEther("6.0");
      const fund2 = ethers.parseEther("4.0");

      const initialBorrowerBal = await ethers.provider.getBalance(borrower.address);

      await lendingCore.connect(lender1).fundLoan(1, { value: fund1 });

      await expect(lendingCore.connect(lender2).fundLoan(1, { value: fund2 }))
        .to.emit(lendingCore, "LoanActivated")
        .withArgs(1);

      const loan = await lendingCore.loans(1);
      expect(loan.status).to.equal(2); // ACTIVE

      const finalBorrowerBal = await ethers.provider.getBalance(borrower.address);
      expect(finalBorrowerBal - initialBorrowerBal).to.equal(PRINCIPAL);
    });
  });

  describe("Advanced EMI & Prepayment", function () {
    beforeEach(async function () {
      await lendingCore.connect(borrower).createLoan(PRINCIPAL, MONTHLY_RATE_BP, DURATION, EMI_AMOUNT);

      // Fully fund with two lenders: Lender1 (4 ETH), Lender2 (6 ETH)
      await lendingCore.connect(lender1).fundLoan(1, { value: ethers.parseEther("4.0") });
      await lendingCore.connect(lender2).fundLoan(1, { value: ethers.parseEther("6.0") });
    });

    it("Should reject payments below EMI amount", async function () {
      const lowPayment = ethers.parseEther("0.5");
      await expect(
        lendingCore.connect(borrower).payEMI(1, { value: lowPayment })
      ).to.be.revertedWith("Payment below required minimum EMI");
    });

    it("Should process standard EMI, reduce principal correctly, and allow lenders to claim proportional share", async function () {
      // EMI = 1.0 ETH. 
      // Interest = (10 ETH * 83) / 10000 = 0.083 ETH
      // Principal Reduction = 1.0 - 0.083 = 0.917 ETH
      const interestExpected = (PRINCIPAL * BigInt(MONTHLY_RATE_BP)) / 10000n;
      const principalReductionExpected = EMI_AMOUNT - interestExpected;

      await expect(lendingCore.connect(borrower).payEMI(1, { value: EMI_AMOUNT }))
        .to.emit(lendingCore, "EMIPaid")
        .withArgs(1, EMI_AMOUNT, principalReductionExpected, interestExpected);

      const loan = await lendingCore.loans(1);
      expect(loan.remainingPrincipal).to.equal(PRINCIPAL - principalReductionExpected);

      // Lender 1 (40%) claims
      const l1ExpectedClaim = (EMI_AMOUNT * 40n) / 100n;
      const l1InitialBal = await ethers.provider.getBalance(lender1.address);
      const tx1 = await lendingCore.connect(lender1).claimRepayment(1);
      const receipt1 = await tx1.wait();
      const gas1 = receipt1.gasUsed * receipt1.gasPrice;
      const l1FinalBal = await ethers.provider.getBalance(lender1.address);
      expect(l1FinalBal).to.equal(l1InitialBal + l1ExpectedClaim - gas1);

      // Lender 2 (60%) claims
      const l2ExpectedClaim = (EMI_AMOUNT * 60n) / 100n;
      const l2InitialBal = await ethers.provider.getBalance(lender2.address);
      const tx2 = await lendingCore.connect(lender2).claimRepayment(1);
      const receipt2 = await tx2.wait();
      const gas2 = receipt2.gasUsed * receipt2.gasPrice;
      const l2FinalBal = await ethers.provider.getBalance(lender2.address);
      expect(l2FinalBal).to.equal(l2InitialBal + l2ExpectedClaim - gas2);
    });

    it("Should process PREPAYMENT (Extra Principal) correctly", async function () {
      // Borrower pays 5 ETH instead of 1 ETH
      const extraPayment = ethers.parseEther("5.0");

      const interestExpected = (PRINCIPAL * BigInt(MONTHLY_RATE_BP)) / 10000n; // 0.083 ETH
      const principalReductionExpected = extraPayment - interestExpected; // 4.917 ETH

      await expect(lendingCore.connect(borrower).payEMI(1, { value: extraPayment }))
        .to.emit(lendingCore, "EMIPaid")
        .withArgs(1, extraPayment, principalReductionExpected, interestExpected);

      const loan = await lendingCore.loans(1);
      expect(loan.remainingPrincipal).to.equal(PRINCIPAL - principalReductionExpected);

      // Total Repayments = 5 ETH. Lender 1 (40%) should claim 2 ETH.
      const l1ExpectedClaim = ethers.parseEther("2.0");
      const l1InitialBal = await ethers.provider.getBalance(lender1.address);
      const tx1 = await lendingCore.connect(lender1).claimRepayment(1);
      const receipt1 = await tx1.wait();
      const gas1 = receipt1.gasUsed * receipt1.gasPrice;
      const l1FinalBal = await ethers.provider.getBalance(lender1.address);
      expect(l1FinalBal).to.equal(l1InitialBal + l1ExpectedClaim - gas1);
    });

    it("Should handle final bullet payoff and status change", async function () {
      // Pay off entire principal + interest in one go
      const interestExpected = (PRINCIPAL * BigInt(MONTHLY_RATE_BP)) / 10000n;
      const fullPayoff = PRINCIPAL + interestExpected;

      await lendingCore.connect(borrower).payEMI(1, { value: fullPayoff });

      const loan = await lendingCore.loans(1);
      expect(loan.remainingPrincipal).to.equal(0);
      expect(loan.status).to.equal(3); // REPAID
    });
  });
});

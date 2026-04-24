import { useState } from "react";
import { ethers } from "ethers";
import { txCreateLoan, txFundLoan, txPayEMI, txClaimRepayment, txMarkDefault } from "../services/contracts";
import { parseWeb3Error } from "./useWeb3Error";

export function useLoans() {
  const [isTxPending, setIsTxPending] = useState(false);

  const executeTx = async (txFunc, ...args) => {
    try {
      setIsTxPending(true);
      const result = await txFunc(...args);
      return result.txHash;
    } catch (err) {
      throw parseWeb3Error(err);
    } finally {
      setIsTxPending(false);
    }
  };

  const createLoan = async (principal, monthlyRateBP, duration, emiAmount) => {
    return executeTx(txCreateLoan, { principal, monthlyRateBP, duration, emiAmount });
  };

  const fundLoan = async (loanId, amountEth) => {
    return executeTx(txFundLoan, loanId, amountEth);
  };

  const payEMI = async (loanId, paymentEth) => {
    return executeTx(txPayEMI, loanId, paymentEth);
  };

  const claimRepayment = async (loanId) => {
    return executeTx(txClaimRepayment, loanId);
  };

  const markDefault = async (loanId) => {
    return executeTx(txMarkDefault, loanId);
  };

  return {
    createLoan,
    fundLoan,
    payEMI,
    claimRepayment,
    markDefault,
    isTxPending
  };
}

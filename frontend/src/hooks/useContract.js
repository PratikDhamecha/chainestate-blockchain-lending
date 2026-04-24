import { useMemo, useEffect } from "react";
import { ethers } from "ethers";
import { LOAN_ABI } from "../services/contracts";

export function useContract() {
  const loanContract = useMemo(() => {
    if (!window.ethereum) return null;
    const provider = new ethers.BrowserProvider(window.ethereum);
    // Use the provider for read-only event listening
    const address = process.env.REACT_APP_LOAN_CONTRACT_ADDRESS;
    if (!address) {
      console.error("REACT_APP_LOAN_CONTRACT_ADDRESS is not defined in environment variables");
      return null;
    }
    return new ethers.Contract(
      address,
      LOAN_ABI,
      provider
    );
  }, []);

  // Reusable event listener setup
  const useEventListener = (eventName, callback) => {
    useEffect(() => {
      if (!loanContract) return;

      const listener = (...args) => {
        console.log(`[Event Received] ${eventName}`, args);
        callback(...args);
      };

      loanContract.on(eventName, listener);
      return () => {
        loanContract.off(eventName, listener);
      };
    }, [loanContract, eventName, callback]);
  };

  return { loanContract, useEventListener };
}

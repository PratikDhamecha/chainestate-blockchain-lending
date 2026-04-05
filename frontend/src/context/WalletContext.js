import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [account, setAccount]   = useState(null);
  const [chainId, setChainId]   = useState(null);
  const [connecting, setConn]   = useState(false);
  const [error, setError]       = useState(null);

  const connect = useCallback(async () => {
    if (!window.ethereum) { setError("MetaMask not installed"); return; }
    try {
      setConn(true); setError(null);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network  = await provider.getNetwork();
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
      localStorage.setItem("walletAddress", accounts[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setConn(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null); setChainId(null);
    localStorage.removeItem("walletAddress");
  }, []);

  // Auto-reconnect if previously connected
  useEffect(() => {
    const saved = localStorage.getItem("walletAddress");
    if (saved && window.ethereum) connect();
  }, []); // eslint-disable-line

  // Listen for account / chain changes
  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accs) => { if (accs.length === 0) disconnect(); else setAccount(accs[0]); };
    const onChain    = (id)   => setChainId(Number(id));
    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged",    onChain);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccounts);
      window.ethereum.removeListener("chainChanged",    onChain);
    };
  }, [disconnect]);

  return (
    <WalletContext.Provider value={{ account, chainId, connecting, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}

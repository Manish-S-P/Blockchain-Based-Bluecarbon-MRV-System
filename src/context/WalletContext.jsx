import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
        } catch (err) {
          console.error("Failed to fetch initial accounts:", err);
        }

        window.ethereum.on('accountsChanged', (accounts) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          } else {
            setAccount(null);
          }
        });

        window.ethereum.on('chainChanged', () => {
          window.location.reload();
        });
      }
    };
    checkIfWalletIsConnected();
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed. Please install it to use this application.");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } catch (err) {
      console.error("User rejected connection request");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
  };

  return (
    <WalletContext.Provider value={{ account, isConnecting, connectWallet, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

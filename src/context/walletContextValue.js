import { createContext, useContext } from 'react';

// Shared wallet context; the provider lives in WalletContext.jsx.
export const WalletContext = createContext(null);
export const useWallet = () => useContext(WalletContext);

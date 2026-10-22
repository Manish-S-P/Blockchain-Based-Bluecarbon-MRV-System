import { useState, useEffect, useCallback, useRef } from 'react';
import { WalletContext } from './walletContextValue';

const tokenStorageKey = (address) => `bcr-auth-token:${address.toLowerCase()}`;

const readStoredToken = (address) => {
  try {
    return sessionStorage.getItem(tokenStorageKey(address));
  } catch {
    return null;
  }
};

const storeToken = (address, token) => {
  try {
    if (token) sessionStorage.setItem(tokenStorageKey(address), token);
    else sessionStorage.removeItem(tokenStorageKey(address));
  } catch {
    // Storage unavailable (private mode); the user will just be asked to sign again.
  }
};

const postJson = async (url, body) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Wallet sign-in failed');
  }
  return data;
};

// Remembers "Log out" so a page refresh does not log the user straight back in
// (MetaMask keeps the site connected until the user disconnects it there).
const LOGGED_OUT_KEY = 'bcr-logged-out';
const setLoggedOut = (value) => {
  try {
    if (value) localStorage.setItem(LOGGED_OUT_KEY, '1');
    else localStorage.removeItem(LOGGED_OUT_KEY);
  } catch {
    // storage unavailable: logout lasts until refresh
  }
};
const isLoggedOut = () => {
  try {
    return localStorage.getItem(LOGGED_OUT_KEY) === '1';
  } catch {
    return false;
  }
};

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0 && !isLoggedOut()) {
            setAccount(accounts[0]);
          }
        } catch (err) {
          console.error('Failed to fetch initial accounts:', err);
        }

        window.ethereum.on('accountsChanged', (accounts) => {
          if (isLoggedOut()) return;
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
      alert('MetaMask is not installed. Please install the MetaMask browser extension to use this application.');
      return;
    }
    setLoggedOut(false);

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } catch {
      console.error('User rejected connection request');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setLoggedOut(true);
    if (account) storeToken(account, null);
    setAccount(null);
  };

  const pendingSignIn = useRef(null);

  // Proves wallet ownership to the backend by signing a one-time login message.
  // Concurrent callers share one sign-in: a second nonce request would invalidate the first.
  const signIn = useCallback(() => {
    if (!pendingSignIn.current) {
      const address = account.toLowerCase();
      pendingSignIn.current = (async () => {
        const { message } = await postJson('/api/auth/nonce', { address });
        const signature = await window.ethereum.request({
          method: 'personal_sign',
          params: [message, address],
        });
        const { token } = await postJson('/api/auth/verify', { address, signature });
        storeToken(address, token);
        return token;
      })().finally(() => {
        pendingSignIn.current = null;
      });
    }
    return pendingSignIn.current;
  }, [account]);

  // fetch() wrapper that attaches the wallet session token, signing in when needed.
  const authFetch = useCallback(async (url, options = {}) => {
    if (!account) throw new Error('Connect your wallet first');
    const send = (token) => fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
    });

    let res = await send(readStoredToken(account) || await signIn());
    if (res.status === 401) {
      res = await send(await signIn());
    }
    return res;
  }, [account, signIn]);

  return (
    <WalletContext.Provider value={{ account, isConnecting, connectWallet, disconnect, authFetch }}>
      {children}
    </WalletContext.Provider>
  );
}

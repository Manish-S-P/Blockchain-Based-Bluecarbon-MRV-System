import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { Leaf, LogOut, PlusCircle, Menu, X, Copy, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { account, connectWallet, disconnect } = useWallet();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (account) {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/register', label: 'Register', icon: <PlusCircle className="w-4 h-4" /> },
  ];

  return (
    <nav className="glass border-b border-white/[0.06] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400/20 rounded-lg blur-md group-hover:bg-emerald-400/30 transition-colors" />
              <Leaf className="h-7 w-7 text-emerald-400 relative" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">
              Blue Carbon<span className="text-emerald-400 ml-1">MRV</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-3">
            {account ? (
              <>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-slate-400 hover:text-white px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/[0.06] flex items-center gap-1.5"
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}

                <button
                  onClick={copyAddress}
                  className="glass-card flex items-center gap-2.5 px-3.5 py-1.5 text-sm cursor-pointer hover:bg-white/[0.08] transition-all duration-200 group"
                  title="Click to copy address"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-slate-300 font-mono text-xs">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
                  )}
                </button>

                <button
                  onClick={() => { disconnect(); navigate('/'); }}
                  className="p-2 text-slate-500 hover:text-rose-400 transition-colors duration-200 hover:bg-white/[0.06] rounded-lg"
                  title="Disconnect Wallet"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </>
            ) : (
              <button
                onClick={connectWallet}
                className="btn-primary px-5 py-2 text-sm glow-emerald"
              >
                Connect Wallet
              </button>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/[0.06] bg-slate-900/95 backdrop-blur-xl animate-scale-in">
          <div className="px-4 py-4 space-y-2">
            {account ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 mb-3">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-slate-300 font-mono text-xs">
                    {account.slice(0, 6)}...{account.slice(-4)}
                  </span>
                </div>
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 text-slate-300 hover:text-white px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-white/[0.06] transition-colors"
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={() => { disconnect(); navigate('/'); setMobileOpen(false); }}
                  className="flex items-center gap-2 text-rose-400 px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-white/[0.06] transition-colors w-full"
                >
                  <LogOut className="h-4 w-4" />
                  Disconnect
                </button>
              </>
            ) : (
              <button
                onClick={() => { connectWallet(); setMobileOpen(false); }}
                className="btn-primary w-full px-5 py-2.5 text-sm"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

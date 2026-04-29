import React from 'react';
import { CheckCircle2, ChevronRight, ExternalLink, X } from 'lucide-react';

const SuccessModal = ({ isOpen, onClose, title, message, txHash }) => {
  if (!isOpen) return null;

  const explorerUrl = txHash ? `https://amoy.polygonscan.com/tx/${txHash}` : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative glass-card w-full max-w-md p-8 shadow-2xl animate-scale-in glow-emerald-strong border-emerald-500/20">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white rounded-lg transition-colors border border-transparent hover:border-white/10 hover:bg-white/5"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mb-6 animate-bounce-subtle">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{title || 'Success!'}</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            {message || 'Transaction completed successfully on the blockchain.'}
          </p>

          {explorerUrl && (
            <div className="w-full bg-slate-900/50 rounded-xl p-4 border border-white/5 mb-8 flex flex-col items-center gap-3">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Transaction Hash</p>
              <p className="text-xs text-slate-300 font-mono break-all opacity-60 px-4">{txHash}</p>
              <a 
                href={explorerUrl} 
                target="_blank" 
                rel="noreferrer"
                className="btn-ghost flex items-center gap-2 px-4 py-2 text-xs text-emerald-400 hover:text-emerald-300 w-full justify-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Verify on Polygonscan
              </a>
            </div>
          )}

          <button 
            onClick={onClose}
            className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
          >
            Continue to Dashboard
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessModal;

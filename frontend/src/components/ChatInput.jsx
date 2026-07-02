import React, { useState } from 'react';

export default function ChatInput({ onSendMessage, isLoading, onSetInputRef }) {
  const [inputValue, setInputValue] = useState('');

  // Expose setter so parent can populate the field (e.g. from welcome chips)
  React.useEffect(() => {
    if (onSetInputRef) onSetInputRef(setInputValue);
  }, [onSetInputRef]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    
    const message = inputValue.trim();
    if (!message) return;

    onSendMessage(message);
    setInputValue('');
  };

  const isSendDisabled = isLoading || !inputValue.trim();

  return (
    <footer className="px-4 pt-3 pb-4 sm:px-6 sm:pb-5 border-t border-crimson/20 bg-bg-primary/90 backdrop-blur-lg shrink-0 relative z-20">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-crimson to-transparent opacity-50" />
      
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Input field */}
        <div className="flex-1 flex items-center bg-bg-input border border-crimson/20 rounded-xl px-4 py-1 focus-within:border-crimson focus-within:shadow-glow transition-all duration-300">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Describe the anime you're looking for..."
            autoComplete="off"
            maxLength={2000}
            disabled={isLoading}
            className="flex-1 bg-transparent border-none outline-none text-text-primary text-sm sm:text-base py-2.5 min-w-0 disabled:opacity-50"
            style={{ caretColor: '#e11d48' }}
          />
        </div>

        {/* Send Button — 44×44px prominent tap target */}
        <button
          type="submit"
          disabled={isSendDisabled}
          className={`
            w-11 h-11 flex items-center justify-center rounded-xl border shrink-0 transition-all duration-200 cursor-pointer
            ${isSendDisabled
              ? 'opacity-40 cursor-not-allowed border-crimson/20 bg-crimson/25 text-text-dark'
              : 'bg-gradient-to-br from-crimson to-rose-950 border-crimson/50 text-white hover:from-rose-700 hover:to-rose-900 hover:border-crimson hover:shadow-glow hover:scale-[1.04] active:scale-[0.97] active:shadow-none shadow-md'
            }
          `}
          title="Send message (Enter)"
        >
          <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 50 L85 20 L50 85 L45 55 Z" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" fill="none"/>
            <path d="M85 20 L45 55" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>
          </svg>
        </button>
      </form>

      {/* Loading Indicator */}
      <div className={`flex items-center justify-center gap-3 pt-2.5 text-[10px] sm:text-xs text-text-muted font-bold tracking-widest uppercase transition-all duration-300 ${isLoading ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
        <div className="w-3.5 h-3.5 border-2 border-crimson/15 border-t-crimson-hover rounded-full animate-spin" />
        <span>Summoning recommendations...</span>
      </div>
    </footer>
  );
}

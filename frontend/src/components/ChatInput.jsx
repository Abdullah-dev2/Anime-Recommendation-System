import React, { useState } from 'react';

export default function ChatInput({ onSendMessage, isLoading }) {
  const [inputValue, setInputValue] = useState('');

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
    <footer className="p-4 sm:p-6 border-t border-crimson/20 bg-bg-primary/90 backdrop-blur-lg shrink-0 relative z-20">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-crimson to-transparent opacity-50" />
      
      <form onSubmit={handleSubmit} className="flex items-center">
        <div className="flex items-center w-full bg-bg-input border border-crimson/20 rounded-xl px-4 py-1.5 focus-within:border-crimson focus-within:shadow-glow transition-all duration-300">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Describe the anime you're looking for..."
            autoComplete="off"
            maxLength={2000}
            disabled={isLoading}
            className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder:text-text-dark text-sm sm:text-base py-2.5 min-w-0 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSendDisabled}
            className={`
              w-10 h-10 flex items-center justify-center rounded-lg border shrink-0 transition-all duration-200 shadow-sm cursor-pointer
              ${isSendDisabled
                ? 'opacity-35 cursor-not-allowed border-transparent bg-crimson/20 text-text-dark'
                : 'bg-gradient-to-r from-crimson to-rose-950 border-crimson/30 text-text-primary hover:from-rose-800 hover:to-rose-900 hover:border-crimson hover:shadow-glow hover:-translate-y-[1px] active:translate-y-0'
              }
            `}
            title="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 50 L85 20 L50 85 L45 55 Z" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" fill="none"/>
              <path d="M85 20 L45 55" stroke="currentColor" strokeWidth="7" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </form>

      {/* Loading Indicator */}
      <div className={`flex items-center justify-center gap-3 pt-3 text-[10px] sm:text-xs text-text-muted font-bold tracking-widest uppercase transition-opacity duration-300 ${isLoading ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
        <div className="w-4 h-4 border-2 border-crimson/15 border-t-crimson-hover rounded-full animate-spin" />
        <span>Summoning recommendations...</span>
      </div>
    </footer>
  );
}

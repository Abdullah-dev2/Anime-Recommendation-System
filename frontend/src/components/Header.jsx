import React from 'react';

export default function Header({ toggleSidebar, sidebarCollapsed }) {
  return (
    <header className="h-13 flex items-center px-4 border-b border-crimson/20 bg-bg-primary/95 backdrop-blur-md shrink-0 relative z-20">
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-crimson to-transparent opacity-60" />
      
      {/* Sidebar Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="w-9 h-9 flex items-center justify-center rounded border border-crimson/25 bg-bg-secondary text-text-secondary hover:text-crimson-hover hover:border-crimson hover:shadow-glow transition-all duration-200"
        title="Toggle history sidebar"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {/* Header Content */}
      <div className="flex-1 flex items-center justify-center gap-3 pr-9">
        <div className="flex items-center gap-2.5">
          {/* Gothic Crest Logo SVG */}
          <svg className="filter drop-shadow-[0_0_8px_rgba(190,18,60,0.5)] animate-pulse" width="26" height="26" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 10 L85 35 L85 70 L50 95 L15 70 L15 35 Z" stroke="var(--accent-crimson, #be123c)" strokeWidth="5" strokeLinejoin="round" fill="rgba(153, 27, 27, 0.15)"/>
            <path d="M50 25 L75 42 L75 65 L50 82 L25 65 L25 42 Z" stroke="var(--accent-crimson, #be123c)" strokeWidth="2.5" strokeLinejoin="round"/>
            <path d="M50 25 L50 82" stroke="var(--accent-crimson, #be123c)" strokeWidth="2" strokeDasharray="3 5"/>
            <circle cx="50" cy="50" r="8" fill="var(--accent-crimson, #be123c)"/>
            <path d="M35 48 L45 52 L50 48" stroke="var(--text-primary, #f1f5f9)" strokeWidth="3" strokeLinecap="round"/>
            <path d="M65 48 L55 52 L50 48" stroke="var(--text-primary, #f1f5f9)" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <h1 className="text-base font-black tracking-wider uppercase bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent filter drop-shadow">
            AniBot
          </h1>
        </div>
        {/* Gold separator dot + subtitle */}
        <div className="hidden sm:flex items-center gap-2.5">
          <span className="text-gold/50 text-base leading-none select-none">·</span>
          <p className="text-[10px] text-text-dark font-bold tracking-widest uppercase">
            Your AI Recommendation Assistant
          </p>
        </div>
      </div>
    </header>
  );
}


import React from 'react';

// Illustrated scroll SVG for the empty state
function ScrollIllustration() {
  return (
    <svg
      className="animate-float"
      width="56"
      height="56"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer scroll body */}
      <rect x="18" y="20" width="64" height="60" rx="6" stroke="rgba(201,168,76,0.35)" strokeWidth="4" fill="rgba(201,168,76,0.04)" />
      {/* Left scroll curl */}
      <ellipse cx="18" cy="50" rx="7" ry="30" stroke="rgba(201,168,76,0.25)" strokeWidth="3" fill="rgba(12,10,16,0.8)" />
      {/* Right scroll curl */}
      <ellipse cx="82" cy="50" rx="7" ry="30" stroke="rgba(201,168,76,0.25)" strokeWidth="3" fill="rgba(12,10,16,0.8)" />
      {/* Text lines */}
      <line x1="30" y1="38" x2="70" y2="38" stroke="rgba(201,168,76,0.2)" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="50" x2="70" y2="50" stroke="rgba(201,168,76,0.2)" strokeWidth="3" strokeLinecap="round" />
      <line x1="30" y1="62" x2="55" y2="62" stroke="rgba(201,168,76,0.15)" strokeWidth="3" strokeLinecap="round" />
      {/* Crimson dot accent */}
      <circle cx="50" cy="50" r="5" fill="rgba(190,18,60,0.5)" />
    </svg>
  );
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSwitchSession,
  onNewSession,
  onDeleteSession,
  sidebarCollapsed,
  closeSidebar
}) {
  // Show ambient empty hint below list when there are fewer than 3 sessions
  const showEmptyHint = sessions.length < 3;

  return (
    <>
      {/* Sidebar Container */}
      <aside className={`
        fixed md:static top-0 left-0 z-40 w-[280px] h-full
        bg-gradient-to-b from-bg-secondary to-bg-primary
        border-r border-crimson/20 flex flex-col shrink-0
        shadow-lg transition-transform duration-300 ease-in-out
        ${sidebarCollapsed ? '-translate-x-full md:-ml-[280px]' : 'translate-x-0 md:ml-0'}
      `}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-crimson/10">
          <h2 className="text-sm font-bold uppercase tracking-widest bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent filter drop-shadow">
            Summonings
          </h2>
          <button
            onClick={closeSidebar}
            className="md:hidden w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-crimson-hover hover:bg-crimson/10 transition-all duration-150"
            title="Close history"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* New Summoning Button */}
        <button
          onClick={onNewSession}
          className="mx-4 my-3 px-4 py-2.5 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-crimson to-rose-950 border border-crimson/40 text-text-primary text-xs font-bold tracking-wide hover:from-rose-800 hover:to-rose-900 hover:border-crimson hover:shadow-glow hover:-translate-y-[1px] active:translate-y-[1px] transition-all duration-150 cursor-pointer"
          title="Start a new chat session"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>New Summoning</span>
        </button>

        {/* Sessions List + optional empty hint below */}
        <div className="flex-1 overflow-y-auto px-3 pb-5 flex flex-col">
          {/* Always show session list */}
          <div className="space-y-1.5 pt-1">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const date = new Date(session.timestamp);
              const formattedDate = date.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={session.id}
                  onClick={() => onSwitchSession(session.id)}
                  className={`
                    group relative flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 border
                    ${isActive 
                      ? 'bg-crimson/10 border-crimson/35 shadow-[inset_0_0_10px_rgba(190,18,60,0.05)]' 
                      : 'bg-white/[0.02] border-white/[0.03] hover:bg-crimson/[0.04] hover:border-crimson/15'
                    }
                  `}
                >
                  {/* Active Indicator Border */}
                  <div className={`
                    absolute left-0 top-0 w-[3px] h-full bg-crimson rounded-l-lg transition-transform duration-200
                    ${isActive ? 'scale-y-100' : 'scale-y-0'}
                  `} />

                  {/* Session Info */}
                  <div className="flex-1 min-w-0 pr-3 flex flex-col gap-0.5">
                    <span className={`
                      text-[13px] font-semibold truncate transition-colors duration-150
                      ${isActive ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'}
                    `}>
                      {session.title}
                    </span>
                    <span className="text-[9px] tracking-wide text-text-dark group-hover:text-text-muted transition-colors duration-150">
                      {formattedDate}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className={`
                      w-6 h-6 flex items-center justify-center rounded text-text-dark hover:text-crimson-hover hover:bg-crimson/10 transition-all duration-150
                      opacity-0 group-hover:opacity-100 focus:opacity-100 ${isActive ? 'opacity-100' : ''}
                    `}
                    title="Delete Summoning"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Muted empty-state hint — fills remaining space when list is short */}
          {showEmptyHint && (
            <div className="flex-1 flex flex-col items-center justify-center py-8 px-4 text-center gap-3 mt-2 opacity-60">
              <ScrollIllustration />
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-text-dark">Your past summonings</p>
                <p className="text-[10px] text-text-dark/70 leading-relaxed">will appear here</p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Sidebar mobile overlay backdrop */}
      {!sidebarCollapsed && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden transition-opacity duration-300"
        />
      )}
    </>
  );
}

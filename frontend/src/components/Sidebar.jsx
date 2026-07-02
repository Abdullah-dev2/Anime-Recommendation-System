import React from 'react';

export default function Sidebar({
  sessions,
  activeSessionId,
  onSwitchSession,
  onNewSession,
  onDeleteSession,
  sidebarCollapsed,
  closeSidebar
}) {
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
        <div className="flex items-center justify-between p-5 border-b border-crimson/10">
          <h2 className="text-lg font-bold uppercase tracking-widest bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent filter drop-shadow">
            Summonings
          </h2>
          <button
            onClick={closeSidebar}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-crimson-hover hover:bg-crimson/10 transition-all duration-150"
            title="Close history"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* New Summoning Button */}
        <button
          onClick={onNewSession}
          className="mx-5 my-4 px-4 py-3 flex items-center justify-center gap-2.5 rounded-lg bg-gradient-to-r from-crimson to-rose-950 border border-crimson/40 text-text-primary text-sm font-bold tracking-wide hover:from-rose-800 hover:to-rose-900 hover:border-crimson hover:shadow-glow hover:-translate-y-[1px] active:translate-y-[1px] transition-all duration-150 cursor-pointer"
          title="Start a new chat session"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>New Summoning</span>
        </button>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-3 pb-5 space-y-2">
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
                  group relative flex items-center justify-between p-3.5 rounded-lg cursor-pointer transition-all duration-200 border
                  ${isActive 
                    ? 'bg-crimson/10 border-crimson/40 shadow-[inset_0_0_10px_rgba(190,18,60,0.05)]' 
                    : 'bg-white/[0.02] border-white/[0.03] hover:bg-crimson/[0.04] hover:border-crimson/15'
                  }
                `}
              >
                {/* Active Indicator Border */}
                <div className={`
                  absolute left-0 top-0 w-[3px] h-full bg-crimson transition-transform duration-200
                  ${isActive ? 'scale-y-100' : 'scale-y-0'}
                `} />

                {/* Session Info */}
                <div className="flex-1 min-w-0 pr-4 flex flex-col gap-0.5">
                  <span className={`
                    text-sm font-semibold truncate transition-colors duration-150
                    ${isActive || 'group-hover:text-text-primary' ? 'text-text-primary' : 'text-text-secondary'}
                  `}>
                    {session.title}
                  </span>
                  <span className="text-[10px] text-text-dark group-hover:text-text-muted transition-colors duration-150">
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
                    w-7 h-7 flex items-center justify-center rounded text-text-dark hover:text-crimson-hover hover:bg-crimson/10 transition-all duration-150
                    opacity-0 group-hover:opacity-100 focus:opacity-100 ${isActive ? 'opacity-100' : ''}
                  `}
                  title="Delete Summoning"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

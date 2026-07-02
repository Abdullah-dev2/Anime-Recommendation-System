import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MessageBubble from './components/MessageBubble';
import ChatInput from './components/ChatInput';

export default function App() {
  // State
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState('');
  const [animeMetadata, setAnimeMetadata] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const chatInputSetterRef = useRef(null); // stores ChatInput's setInputValue

  // Initialize and load from local storage
  useEffect(() => {
    const storedSessions = localStorage.getItem('anibot_sessions');
    const storedActiveId = localStorage.getItem('anibot_active_session_id');
    const storedMetadata = localStorage.getItem('anibot_anime_metadata');

    let loadedSessions = [];
    let loadedActiveId = '';
    let loadedMetadata = {};

    if (storedSessions) {
      try {
        loadedSessions = JSON.parse(storedSessions);
      } catch (e) {
        console.error('Failed to parse sessions:', e);
      }
    }

    if (storedMetadata) {
      try {
        loadedMetadata = JSON.parse(storedMetadata);
        setAnimeMetadata(loadedMetadata);
      } catch (e) {
        console.error('Failed to parse metadata:', e);
      }
    }

    // Default first session if none exists
    if (loadedSessions.length === 0) {
      const defaultId = generateUuid();
      const defaultSession = {
        id: defaultId,
        title: 'New Summoning',
        timestamp: new Date().toISOString(),
        messages: []
      };
      loadedSessions = [defaultSession];
      loadedActiveId = defaultId;
    } else {
      loadedActiveId = storedActiveId || loadedSessions[0].id;
      // Make sure the active ID actually exists in sessions
      if (!loadedSessions.some(s => s.id === loadedActiveId)) {
        loadedActiveId = loadedSessions[0].id;
      }
    }

    setSessions(loadedSessions);
    setActiveSessionId(loadedActiveId);
    localStorage.setItem('anibot_sessions', JSON.stringify(loadedSessions));
    localStorage.setItem('anibot_active_session_id', loadedActiveId);

    // Initial sidebar state based on screen size
    if (window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  }, []);

  // Sync state to local storage when changed
  const saveState = (updatedSessions, updatedActiveId, updatedMetadata) => {
    if (updatedSessions) {
      setSessions(updatedSessions);
      localStorage.setItem('anibot_sessions', JSON.stringify(updatedSessions));
    }
    if (updatedActiveId) {
      setActiveSessionId(updatedActiveId);
      localStorage.setItem('anibot_active_session_id', updatedActiveId);
    }
    if (updatedMetadata) {
      setAnimeMetadata(updatedMetadata);
      localStorage.setItem('anibot_anime_metadata', JSON.stringify(updatedMetadata));
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = (force = false) => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const threshold = 150; // trigger zone
      const position = container.scrollTop + container.clientHeight;
      const isNearBottom = container.scrollHeight - position < threshold;

      if (force || isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  // Scroll to bottom on new messages
  const activeSession = sessions.find(s => s.id === activeSessionId);
  useEffect(() => {
    scrollToBottom(true);
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom(false);
  }, [activeSession?.messages?.length]);

  // UUID generator
  const generateUuid = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Session title generator
  const generateTitleFromMessage = (message) => {
    if (!message) return 'New Summoning';
    const clean = message.trim()
      .replace(/[#*`_\[\]]/g, '') // strip common markdown
      .replace(/\s+/g, ' ')
      .substring(0, 28);
    return clean.length < message.trim().length ? clean + '...' : clean;
  };

  // Handle creating a new session
  const handleNewSession = () => {
    const newId = generateUuid();
    const newSession = {
      id: newId,
      title: 'New Summoning',
      timestamp: new Date().toISOString(),
      messages: []
    };

    const updatedSessions = [newSession, ...sessions];
    saveState(updatedSessions, newId);
    
    if (window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  };

  // Handle switching active session
  const handleSwitchSession = (id) => {
    saveState(null, id);
    if (window.innerWidth <= 768) {
      setSidebarCollapsed(true);
    }
  };

  // Handle deleting a session
  const handleDeleteSession = (id) => {
    if (sessions.length <= 1) {
      // If last session, clear messages instead of deleting the session container
      const updated = sessions.map(s => {
        if (s.id === id) {
          return {
            ...s,
            title: 'New Summoning',
            timestamp: new Date().toISOString(),
            messages: []
          };
        }
        return s;
      });
      saveState(updated, id);
      return;
    }

    const updatedSessions = sessions.filter(s => s.id !== id);
    let nextActiveId = activeSessionId;
    
    if (id === activeSessionId) {
      nextActiveId = updatedSessions[0].id;
    }
    
    saveState(updatedSessions, nextActiveId);
  };

  // Handle sending a message and streaming SSE response
  const handleSendMessage = async (userMessage) => {
    if (isLoading) return;

    // 1. Update current session history with user message
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (!currentSession) return;

    const userMsgCount = currentSession.messages.filter(m => m.role === 'user').length;
    const isFirstMsg = currentSession.title === 'New Summoning' || userMsgCount === 0;
    const newTitle = isFirstMsg ? generateTitleFromMessage(userMessage) : currentSession.title;

    const updatedUserMessages = [
      ...currentSession.messages,
      { role: 'user', content: userMessage }
    ];

    let updatedSessions = sessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          title: newTitle,
          messages: updatedUserMessages,
          timestamp: new Date().toISOString()
        };
      }
      return s;
    });

    // Bring active session to top of history list if it was a new message
    const activeIdx = updatedSessions.findIndex(s => s.id === activeSessionId);
    if (activeIdx > 0) {
      const [activeItem] = updatedSessions.splice(activeIdx, 1);
      updatedSessions = [activeItem, ...updatedSessions];
    }

    saveState(updatedSessions);
    setIsLoading(true);

    // Prepare history payload for API (exclude this user message we just created)
    const historyPayload = currentSession.messages;

    // Append a placeholder assistant message to stream tokens into
    const assistantPlaceholder = { role: 'assistant', content: '' };
    const sessionsWithPlaceholder = updatedSessions.map(s => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [...updatedUserMessages, assistantPlaceholder]
        };
      }
      return s;
    });
    setSessions(sessionsWithPlaceholder);

    let accumulatedResponse = '';
    let currentMetadata = { ...animeMetadata };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          session_id: activeSessionId,
          history: historyPayload
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Hold incomplete line

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line.startsWith('data: ')) continue;

          try {
            const payload = JSON.parse(line.slice(6));

            if (payload.type === 'metadata') {
              if (payload.anime_results) {
                payload.anime_results.forEach(anime => {
                  if (anime.mal_id) {
                    currentMetadata[anime.mal_id.toString()] = anime;
                  }
                });
                saveState(null, null, currentMetadata);
              }
            } else if (payload.type === 'token') {
              accumulatedResponse += payload.text;
              
              // Update stream text in state
              setSessions(prevSessions => 
                prevSessions.map(s => {
                  if (s.id === activeSessionId) {
                    const msgs = [...s.messages];
                    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
                      msgs[msgs.length - 1] = { role: 'assistant', content: accumulatedResponse };
                    }
                    return { ...s, messages: msgs };
                  }
                  return s;
                })
              );
              scrollToBottom(false);
            } else if (payload.type === 'error') {
              throw new Error(payload.detail);
            }
          } catch (err) {
            console.error('Failed to parse stream chunk:', line, err);
          }
        }
      }

      // Save finalized session data
      const finalSessions = sessionsWithPlaceholder.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...updatedUserMessages, { role: 'assistant', content: accumulatedResponse }]
          };
        }
        return s;
      });
      saveState(finalSessions);

    } catch (err) {
      console.error('SSE connection error:', err);
      const errMsg = `⚠️ **Error:** ${err.message}. Please try again.`;
      
      const finalSessions = sessionsWithPlaceholder.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...updatedUserMessages, { role: 'assistant', content: errMsg }]
          };
        }
        return s;
      });
      saveState(finalSessions);
    } finally {
      setIsLoading(false);
    }
  };

  // Welcome page prompts click handler — populates input field (user can review/edit)
  const handlePromptClick = (text) => {
    if (chatInputSetterRef.current) {
      chatInputSetterRef.current(text);
    }
  };

  return (
    <div className="flex w-full h-screen overflow-hidden relative">
      {/* Sidebar Component */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSwitchSession={handleSwitchSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        sidebarCollapsed={sidebarCollapsed}
        closeSidebar={() => setSidebarCollapsed(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-bg-primary/50 relative z-10">
        {/* Slim Header */}
        <Header
          toggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Chat / Messages Area */}
        <main 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-4"
        >
          <div className="max-w-4xl mx-auto w-full">
            {activeSession && activeSession.messages.length > 0 ? (
              // Active chat message bubbles
              activeSession.messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  message={msg}
                  animeMetadata={animeMetadata}
                  prevRole={idx > 0 ? activeSession.messages[idx - 1].role : null}
                />
              ))
            ) : (
              // Welcome Hero (when no messages yet)
              <div className="flex flex-col items-center text-center gap-8 py-12 sm:py-16 animate-fadeIn">
                {/* Large Hexagon Logo Mark */}
                <div className="relative flex items-center justify-center">
                  {/* Outer glow ring */}
                  <div className="absolute w-28 h-28 rounded-full bg-crimson/[0.08] blur-2xl" />
                  <div className="w-20 h-20 rounded-2xl flex items-center justify-center bg-bg-secondary border border-crimson/30 shadow-[0_0_32px_rgba(190,18,60,0.25)] ring-1 ring-crimson/10">
                    <svg width="44" height="44" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M50 8 L88 32 L88 68 L50 92 L12 68 L12 32 Z" stroke="var(--accent-crimson, #be123c)" strokeWidth="5" strokeLinejoin="round" fill="rgba(153, 27, 27, 0.2)"/>
                      <circle cx="50" cy="50" r="12" fill="var(--accent-crimson, #be123c)"/>
                      <path d="M33 47 L44 52 L50 46" stroke="white" strokeWidth="4.5" strokeLinecap="round"/>
                      <path d="M67 47 L56 52 L50 46" stroke="white" strokeWidth="4.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>

                {/* Headline + Subtitle */}
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                    What are you in the mood<br className="hidden sm:block" /> to watch?
                  </h1>
                  <p className="text-text-muted text-sm sm:text-base max-w-md mx-auto leading-relaxed">
                    Describe a vibe, a genre, a feeling — AniBot will summon your next obsession.
                  </p>
                </div>

                {/* 2×3 Suggestion Chip Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
                  {[
                    { emoji: '🔪', label: 'Something like Death Note', prompt: 'I want something dark and psychological like Death Note' },
                    { emoji: '✨', label: 'Feel-good slice of life', prompt: 'Recommend a heartwarming feel-good slice of life anime' },
                    { emoji: '💎', label: 'Underrated hidden gems', prompt: 'Show me underrated hidden gem anime most people haven\'t seen' },
                    { emoji: '🌸', label: 'Fun comedy isekai', prompt: 'Give me a fun comedy isekai with a great cast' },
                    { emoji: '🎬', label: 'Best of this season', prompt: 'What are the best anime from this current season?' },
                    { emoji: '🤖', label: 'Cyberpunk & action', prompt: 'Recommend a cyberpunk thriller with great action scenes' },
                  ].map(({ emoji, label, prompt }) => (
                    <button
                      key={label}
                      onClick={() => handlePromptClick(prompt)}
                      className="group flex items-center gap-3 p-3.5 text-left rounded-xl bg-bg-secondary/60 border border-white/[0.07] hover:border-crimson/40 hover:bg-crimson/[0.05] text-text-muted hover:text-text-primary transition-all duration-200 text-sm font-medium cursor-pointer"
                    >
                      <span className="text-xl shrink-0 group-hover:scale-110 transition-transform duration-150">{emoji}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                <p className="text-text-dark text-xs tracking-wide">
                  Click a suggestion or type your own below ↓
                </p>
              </div>
            )}
            
            {/* Scroll Anchor */}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Form Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onSetInputRef={(setter) => { chatInputSetterRef.current = setter; }}
        />
      </div>
    </div>
  );
}

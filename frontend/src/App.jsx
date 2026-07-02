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

  // Welcome page prompts click handler
  const handlePromptClick = (text) => {
    handleSendMessage(text);
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
          <div className="max-w-3xl mx-auto w-full">
            {activeSession && activeSession.messages.length > 0 ? (
              // Active chat message bubbles
              activeSession.messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  message={msg}
                  animeMetadata={animeMetadata}
                />
              ))
            ) : (
              // Welcome Screen (when no messages yet)
              <div className="flex flex-col gap-6 py-8 text-left animate-fadeIn">
                <div className="flex gap-4 p-5 rounded-xl bg-bg-message-bot border border-crimson/20 border-l-[3px] border-l-crimson">
                  <div className="w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0 bg-bg-secondary border border-crimson/20 shadow-[0_0_10px_rgba(190,18,60,0.15)]">
                    <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M50 10 L85 35 L85 70 L50 95 L15 70 L15 35 Z" stroke="var(--accent-crimson, #be123c)" strokeWidth="6" strokeLinejoin="round" fill="rgba(153, 27, 27, 0.25)"/>
                      <circle cx="50" cy="50" r="10" fill="var(--accent-crimson, #be123c)"/>
                      <path d="M35 48 L45 52 L50 48" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                      <path d="M65 48 L55 52 L50 48" stroke="white" strokeWidth="4" strokeLinecap="round"/>
                    </svg>
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <p className="text-text-primary text-base">
                      Welcome, traveler of the anime realms. I am <strong className="font-bold text-white">AniBot</strong>, your guide through the shadows of story and animation.
                    </p>
                    <p className="text-text-secondary text-sm">
                      Speak of the tales you wish to summon. Select one of the paths below or describe your desires:
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                      <button
                        onClick={() => handlePromptClick("I want something dark and psychological like Death Note")}
                        className="p-3 text-left rounded-lg bg-bg-primary/40 border border-white/5 hover:border-crimson/40 hover:bg-crimson/[0.03] text-text-secondary hover:text-white transition-all duration-150 text-xs font-semibold cursor-pointer"
                      >
                        "I want something dark and psychological like Death Note"
                      </button>
                      <button
                        onClick={() => handlePromptClick("Give me a fun comedy isekai")}
                        className="p-3 text-left rounded-lg bg-bg-primary/40 border border-white/5 hover:border-crimson/40 hover:bg-crimson/[0.03] text-text-secondary hover:text-white transition-all duration-150 text-xs font-semibold cursor-pointer"
                      >
                        "Give me a fun comedy isekai"
                      </button>
                      <button
                        onClick={() => handlePromptClick("Something emotional with great animation")}
                        className="p-3 text-left rounded-lg bg-bg-primary/40 border border-white/5 hover:border-crimson/40 hover:bg-crimson/[0.03] text-text-secondary hover:text-white transition-all duration-150 text-xs font-semibold cursor-pointer"
                      >
                        "Something emotional with great animation"
                      </button>
                      <button
                        onClick={() => handlePromptClick("Recommend a cyberpunk thriller with action")}
                        className="p-3 text-left rounded-lg bg-bg-primary/40 border border-white/5 hover:border-crimson/40 hover:bg-crimson/[0.03] text-text-secondary hover:text-white transition-all duration-150 text-xs font-semibold cursor-pointer"
                      >
                        "Recommend a cyberpunk thriller with action"
                      </button>
                    </div>

                    <p className="text-text-muted text-xs pt-1.5">
                      What kind of anime are you looking for today? ⚔️
                    </p>
                  </div>
                </div>
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
        />
      </div>
    </div>
  );
}

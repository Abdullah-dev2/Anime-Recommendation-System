import React from 'react';
import RecommendationCard from './RecommendationCard';

export default function MessageBubble({ message, animeMetadata, prevRole }) {
  const { role, content } = message;
  const isUser = role === 'user';

  // Spacing: 8px gap for same-role sequence, 24px for role-switch
  const marginClass = prevRole === role ? 'mb-2' : 'mb-6';

  // Parse the assistant response to split text blocks from recommendation cards
  const parseResponseToBlocks = (text) => {
    if (!text) return [];

    const recRegex = /\[RECOMMENDATION\s+id="(\d+)"\]([\s\S]*?)(?:\[\/RECOMMENDATION\]|$)/gi;
    let lastIndex = 0;
    const blocks = [];
    let match;

    recRegex.lastIndex = 0;

    while ((match = recRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      const id = match[1];
      const blurb = match[2];

      const precedingText = text.substring(lastIndex, matchIndex);
      if (precedingText) {
        blocks.push({ type: 'text', content: precedingText });
      }

      blocks.push({ type: 'card', id: id, blurb: blurb });
      lastIndex = recRegex.lastIndex;
    }

    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      blocks.push({ type: 'text', content: remainingText });
    }

    return blocks;
  };

  // Basic HTML markdown formatter for general message text blocks
  const renderMarkdownText = (text) => {
    if (!text) return null;
    
    // Split by lines to handle list items, blockquotes, code blocks, etc.
    const lines = text.split('\n');
    let inList = false;
    let listType = ''; // 'ul' or 'ol'
    const elements = [];
    let currentListItems = [];

    const flushList = (key) => {
      if (currentListItems.length > 0) {
        const Tag = listType;
        elements.push(
          <Tag key={key} className="list-disc pl-6 my-2 space-y-1 text-text-secondary">
            {currentListItems}
          </Tag>
        );
        currentListItems = [];
        inList = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const isUnordered = /^\s*[-*+]\s+(.+)/.test(line);
      const isOrdered = /^\s*\d+\.\s+(.+)/.test(line);

      if (isUnordered) {
        const content = line.match(/^\s*[-*+]\s+(.+)/)[1];
        if (!inList || listType !== 'ul') {
          flushList(`list-before-${index}`);
          inList = true;
          listType = 'ul';
        }
        currentListItems.push(<li key={`li-${index}`} className="marker:text-crimson text-text-secondary">{renderInlineMarkdown(content)}</li>);
      } else if (isOrdered) {
        const content = line.match(/^\s*\d+\.\s+(.+)/)[1];
        if (!inList || listType !== 'ol') {
          flushList(`list-before-${index}`);
          inList = true;
          listType = 'ol';
        }
        currentListItems.push(<li key={`li-${index}`} className="marker:text-crimson text-text-secondary">{renderInlineMarkdown(content)}</li>);
      } else {
        flushList(`list-flush-${index}`);
        
        if (trimmed === '') {
          elements.push(<div key={`br-${index}`} className="h-2" />);
        } else {
          // Headers
          const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
          if (headingMatch) {
            const level = headingMatch[1].length;
            const textContent = headingMatch[2];
            const Tag = `h${level + 1}`;
            const headerClasses = level === 1 
              ? 'text-lg font-bold text-text-primary mt-4 mb-2' 
              : 'text-base font-bold text-text-primary mt-3 mb-1.5';
            elements.push(<Tag key={`h-${index}`} className={headerClasses}>{renderInlineMarkdown(textContent)}</Tag>);
          } else {
            elements.push(<p key={`p-${index}`} className="text-text-secondary leading-relaxed mb-3 last:mb-0">{renderInlineMarkdown(line)}</p>);
          }
        }
      }
    });

    flushList(`list-end`);
    return <div className="space-y-1">{elements}</div>;
  };

  const renderInlineMarkdown = (text) => {
    if (!text) return '';
    
    // Bold, italic, code
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-text-primary font-bold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="text-text-muted italic">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-crimson/10 text-rose-300 px-1.5 py-0.5 rounded border border-crimson/15 text-xs">$1</code>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-crimson-hover hover:underline font-semibold">$1</a>');

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className={`flex gap-3 w-full max-w-full animate-fadeInUp ${marginClass} ${isUser ? 'flex-row-reverse self-end justify-start' : 'flex-row self-start'}`}>
      
      {/* Avatar Icon */}
      <div className={`
        w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-bg-secondary border shadow-sm transition-transform duration-200 mt-0.5
        ${isUser 
          ? 'border-gold/[0.35] shadow-[0_0_10px_rgba(201,168,76,0.15)] ring-1 ring-gold/10 bg-[#0f0e0a]' 
          : 'border-crimson/30 shadow-[0_0_12px_rgba(190,18,60,0.2)] ring-1 ring-crimson/10'
        }
      `}>
        {isUser ? (
          // User Icon — slate tones for clear distinction from bot
          <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 10 L80 25 L80 60 C80 75 50 90 50 90 C50 90 20 75 20 60 L20 25 Z" stroke="#7a8fa6" strokeWidth="6" strokeLinejoin="round" fill="rgba(122, 143, 166, 0.12)"/>
            <circle cx="50" cy="40" r="14" stroke="#7a8fa6" strokeWidth="4"/>
            <path d="M28 72 C28 60 38 52 50 52 C62 52 72 60 72 72" stroke="#7a8fa6" strokeWidth="4" strokeLinecap="round"/>
          </svg>
        ) : (
          // Bot Hexagon Logo Icon — crimson brand mark
          <svg width="20" height="20" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 10 L85 35 L85 70 L50 95 L15 70 L15 35 Z" stroke="var(--accent-crimson, #be123c)" strokeWidth="6" strokeLinejoin="round" fill="rgba(153, 27, 27, 0.25)"/>
            <circle cx="50" cy="50" r="10" fill="var(--accent-crimson, #be123c)"/>
            <path d="M35 48 L45 52 L50 48" stroke="white" strokeWidth="4" strokeLinecap="round"/>
            <path d="M65 48 L55 52 L50 48" stroke="white" strokeWidth="4" strokeLinecap="round"/>
          </svg>
        )}
      </div>

      {/* Message Bubble Content */}
      <div className={`
        max-w-[82%] sm:max-w-[75%] rounded-xl px-5 py-3.5 shadow-sm text-sm leading-relaxed
        ${isUser 
          ? 'bg-bg-message-user text-text-primary border border-white/[0.07] border-r-2 border-r-white/20 self-end' 
          : 'bg-bg-message-bot text-text-secondary border border-crimson/15 border-l-[3px] border-l-crimson self-start'
        }
      `}>
        {isUser ? (
          <p className="text-text-primary whitespace-pre-wrap">{content}</p>
        ) : (
          // Dynamic rendering for bot responses
          <div className="space-y-5">
            {parseResponseToBlocks(content).map((block, idx) => {
              if (block.type === 'text') {
                return <div key={idx}>{renderMarkdownText(block.content)}</div>;
              } else if (block.type === 'card') {
                const animeData = animeMetadata[block.id];
                if (animeData) {
                  return (
                    <RecommendationCard
                      key={idx}
                      anime={{
                        ...animeData,
                        blurb: block.blurb,
                        id: block.id
                      }}
                    />
                  );
                } else {
                  // Fallback loading card
                  return (
                    <div key={idx} className="flex gap-4 bg-bg-secondary/40 border border-dashed border-white/10 rounded-xl p-4 my-4 animate-pulse">
                      <div className="flex-1">
                        <div className="h-4 bg-white/5 rounded w-1/3 mb-2" />
                        <p className="text-xs text-text-muted mt-1">{block.blurb}</p>
                      </div>
                    </div>
                  );
                }
              }
              return null;
            })}
          </div>
        )}
      </div>
      
    </div>
  );
}

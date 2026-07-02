import React, { useState, useRef, useEffect } from 'react';

export default function RecommendationCard({ anime }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const blurbRef = useRef(null);

  const blurbText = anime.blurb || '';

  // Check if text is overflowing after rendering
  useEffect(() => {
    const checkOverflow = () => {
      if (blurbRef.current) {
        const element = blurbRef.current;
        setIsOverflowing(element.scrollHeight > element.clientHeight);
      }
    };

    // Run check next frame or after short timeout to let CSS apply
    const timer = setTimeout(checkOverflow, 50);
    window.addEventListener('resize', checkOverflow);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [blurbText, isExpanded]);

  // Render markdown inline code, bold, links, etc. simply
  const renderMarkdown = (text) => {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-crimson/10 text-rose-300 px-1 py-0.5 rounded border border-crimson/15 text-xs">$1</code>');
    
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 bg-bg-secondary/80 border border-white/[0.06] hover:border-crimson/40 rounded-xl p-4 my-4 shadow-md hover:shadow-glow/10 hover:-translate-y-[2px] transition-all duration-300 relative overflow-hidden group">
      {/* Anime Cover Image */}
      <div className="shrink-0 w-24 h-34 sm:w-[95px] sm:h-[135px] rounded-lg overflow-hidden border border-white/5 bg-bg-primary relative mx-auto sm:mx-0">
        {anime.image_url ? (
          <img
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            src={anime.image_url}
            alt={anime.title}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-secondary to-bg-tertiary">
            <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M50 10 L85 35 L85 70 L50 95 L15 70 L15 35 Z" stroke="var(--accent-crimson, #be123c)" strokeWidth="4" strokeLinejoin="round" fill="rgba(153, 27, 27, 0.1)"/>
              <circle cx="50" cy="50" r="10" fill="var(--accent-crimson, #be123c)"/>
            </svg>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="flex-1 flex flex-col min-w-0 text-left">
        {/* Card Header */}
        <div className="flex justify-between items-start gap-3 mb-1.5">
          <h3 className="text-base font-extrabold text-text-primary leading-snug tracking-tight group-hover:text-white transition-colors duration-150">
            {anime.title || `Recommendation (ID: ${anime.id})`}
          </h3>
          
          {/* Crimson Score Badge */}
          {anime.score && (
            <div className="inline-flex items-center bg-crimson/10 border border-crimson rounded-full px-2.5 py-0.5 shrink-0 shadow-[0_0_8px_rgba(190,18,60,0.15)]">
              <span className="text-[9px] font-bold tracking-wider text-crimson-hover mr-1.5 uppercase">MAL</span>
              <span className="text-xs font-extrabold text-text-primary">{Number(anime.score).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Genre Tags */}
        {anime.genres && anime.genres.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="text-[9px] font-bold tracking-widest text-text-muted uppercase mr-1">Genres:</span>
            {anime.genres.map((g, idx) => (
              <span
                key={idx}
                className="text-[10px] font-semibold text-text-secondary bg-white/[0.03] border border-white/5 hover:border-text-muted hover:bg-white/[0.08] px-1.5 py-0.5 rounded transition-all duration-150"
              >
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Blurb Body Description */}
        <div className="relative flex-1">
          <div
            ref={blurbRef}
            className={`text-sm text-text-secondary leading-relaxed mb-3 ${isExpanded ? '' : 'line-clamp-3'}`}
          >
            {renderMarkdown(blurbText)}
          </div>
          
          {/* Read More / Read Less Toggle */}
          {(isOverflowing || isExpanded) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-bold text-crimson-hover hover:text-white hover:underline transition-colors duration-150 mb-3 block text-left"
            >
              {isExpanded ? 'Read less' : 'Read more'}
            </button>
          )}
        </div>

        {/* MAL Profile Link Button */}
        {anime.url && (
          <a
            href={anime.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-xs font-bold text-text-primary bg-gradient-to-r from-crimson to-rose-950 border border-crimson/40 hover:border-crimson px-3 py-1.5 rounded hover:shadow-[0_4px_12px_rgba(190,18,60,0.3)] hover:-translate-y-[1px] active:translate-y-0 transition-all duration-150 cursor-pointer"
          >
            <span>MyAnimeList Profile</span>
            <svg className="group-hover:translate-x-[1px] group-hover:-translate-y-[1px] transition-transform duration-150" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

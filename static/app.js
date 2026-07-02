/**
 * AniBot Chat Application - Vanilla JS
 * Handles message sending, response rendering, and UI state management.
 */

(function () {
    "use strict";

    // DOM Elements
    const chatForm = document.getElementById("chat-form");
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");
    const messagesWrapper = document.getElementById("messages-wrapper");
    const loadingIndicator = document.getElementById("loading-indicator");

    // State
    let sessionId = "";
    let isLoading = false;
    let animeMetadata = {}; // key: mal_id (string), value: anime object

    /**
     * Parse the response text to extract [RECOMMENDATION] blocks and convert
     * them into rich Gothic-themed card components using loaded metadata.
     */
    /**
     * Parse the response text into structured blocks of text and recommendations.
     */
    function parseResponseToBlocks(text) {
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
                blocks.push({ type: "text", content: precedingText });
            }

            blocks.push({ type: "card", id: id, blurb: blurb });
            lastIndex = recRegex.lastIndex;
        }

        const remainingText = text.substring(lastIndex);
        if (remainingText) {
            blocks.push({ type: "text", content: remainingText });
        }

        return blocks;
    }

    /**
     * Render blocks into a container dynamically, diffing against existing children
     * to avoid layout thrashing and image reloading during streaming.
     */
    function renderBlocks(blocks, container) {
        // Remove excess children if the number of blocks decreased
        while (container.children.length > blocks.length) {
            container.removeChild(container.lastChild);
        }

        blocks.forEach((block, index) => {
            let child = container.children[index];

            if (block.type === "text") {
                const htmlContent = markdownToHtml(block.content);
                
                if (!child || !child.classList.contains("text-block")) {
                    const newChild = document.createElement("div");
                    newChild.className = "text-block";
                    newChild.innerHTML = htmlContent;
                    
                    if (child) {
                        container.replaceChild(newChild, child);
                    } else {
                        container.appendChild(newChild);
                    }
                } else {
                    if (child.innerHTML !== htmlContent) {
                        child.innerHTML = htmlContent;
                    }
                }
            } else if (block.type === "card") {
                const id = block.id;
                const blurbHtml = markdownToHtml(block.blurb.trim());

                if (!child || !child.classList.contains("anime-card") || child.getAttribute("data-id") !== id) {
                    const newChild = document.createElement("div");
                    newChild.className = "anime-card";
                    newChild.setAttribute("data-id", id);
                    
                    const anime = animeMetadata[id];
                    if (anime) {
                        const imageHtml = anime.image_url ? 
                            `<img class="anime-cover" src="${anime.image_url}" alt="${anime.title}" loading="lazy" />` : 
                            `<div class="anime-cover placeholder-cover">
                                <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M50 10 L85 35 L85 70 L50 95 L15 70 L15 35 Z" stroke="var(--accent-crimson)" stroke-width="4" stroke-linejoin="round" fill="rgba(153, 27, 27, 0.1)"/>
                                    <circle cx="50" cy="50" r="10" fill="var(--accent-crimson)"/>
                                </svg>
                             </div>`;

                        const genresHtml = anime.genres ? 
                            anime.genres.map(g => `<span class="anime-genre-tag">${g}</span>`).join("") : "";

                        const malLinkHtml = anime.url ? 
                            `<a href="${anime.url}" target="_blank" rel="noopener noreferrer" class="anime-mal-link">
                                <span>MyAnimeList Profile</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                    <polyline points="15 3 21 3 21 9"></polyline>
                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                </svg>
                             </a>` : "";

                        newChild.innerHTML = `
                            <div class="anime-card-left">
                                ${imageHtml}
                            </div>
                            <div class="anime-card-right">
                                <div class="anime-card-header">
                                    <h3 class="anime-title">${anime.title}</h3>
                                    <div class="anime-score-pill">
                                        <span class="score-label">MAL SCORE</span>
                                        <span class="score-value">${anime.score ? Number(anime.score).toFixed(2) : "N/A"}</span>
                                    </div>
                                </div>
                                <div class="anime-genres">
                                    <span class="genres-label">Genres:</span>
                                    ${genresHtml}
                                </div>
                                <div class="anime-blurb">
                                    ${blurbHtml}
                                </div>
                                ${malLinkHtml}
                            </div>
                        `;
                    } else {
                        // Fallback loading card
                        newChild.className = "anime-card loading-card";
                        newChild.innerHTML = `
                            <div class="anime-card-right">
                                <div class="anime-card-header">
                                    <h3 class="anime-title">Recommendation (ID: ${id})</h3>
                                </div>
                                <div class="anime-blurb">
                                    ${blurbHtml}
                                </div>
                            </div>
                        `;
                    }

                    if (child) {
                        container.replaceChild(newChild, child);
                    } else {
                        container.appendChild(newChild);
                    }
                } else {
                    // Update only blurb innerHTML if changed
                    const blurbContainer = child.querySelector(".anime-blurb");
                    if (blurbContainer && blurbContainer.innerHTML !== blurbHtml) {
                        blurbContainer.innerHTML = blurbHtml;
                    }
                }
            }
        });
    }

    /**
     * Scroll to the bottom of the chat container ONLY if the user is already near the bottom.
     * Prevents forcefully dragging the user down when they scroll up to read.
     */
    function scrollToBottomIfNear() {
        const threshold = 150; // trigger zone (pixels from bottom)
        const position = messagesWrapper.scrollTop + messagesWrapper.clientHeight;
        const isNearBottom = messagesWrapper.scrollHeight - position < threshold;
        
        if (isNearBottom) {
            messagesWrapper.scrollTop = messagesWrapper.scrollHeight;
        }
    }

    /**
     * Convert basic markdown to HTML for rendering in message bubbles.
     * Supports: bold, italic, links, unordered lists, ordered lists, code, line breaks.
     */
    function markdownToHtml(text) {
        if (!text) return "";

        let html = text;

        // Escape HTML entities first
        html = html.replace(/&/g, "&amp;");
        html = html.replace(/</g, "&lt;");
        html = html.replace(/>/g, "&gt;");

        // Code blocks (```...```)
        html = html.replace(/```[\s\S]*?```/g, function (match) {
            const code = match.slice(3, -3).trim();
            return '<pre><code>' + code + '</code></pre>';
        });

        // Inline code (`...`)
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold (**text** or __text__)
        html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");

        // Italic (*text* or _text_)
        html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
        html = html.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>");

        // Links [text](url)
        html = html.replace(
            /\[([^\]]+)\]\(([^)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );

        // Bare URLs
        html = html.replace(
            /(?<!")(?<!=)(https?:\/\/[^\s<]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );

        // Split into lines for block-level processing
        const lines = html.split("\n");
        const processedLines = [];
        let inList = false;
        let listType = "";

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const unorderedMatch = line.match(/^(\s*)[-*+]\s+(.+)/);
            const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)/);

            if (unorderedMatch) {
                if (!inList || listType !== "ul") {
                    if (inList) processedLines.push(`</${listType}>`);
                    processedLines.push("<ul>");
                    inList = true;
                    listType = "ul";
                }
                processedLines.push(`<li>${unorderedMatch[2]}</li>`);
            } else if (orderedMatch) {
                if (!inList || listType !== "ol") {
                    if (inList) processedLines.push(`</${listType}>`);
                    processedLines.push("<ol>");
                    inList = true;
                    listType = "ol";
                }
                processedLines.push(`<li>${orderedMatch[2]}</li>`);
            } else {
                if (inList) {
                    processedLines.push(`</${listType}>`);
                    inList = false;
                    listType = "";
                }
                if (line.trim() === "") {
                    processedLines.push("<br>");
                } else {
                    // Headings
                    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
                    if (headingMatch) {
                        const level = headingMatch[1].length;
                        processedLines.push(`<h${level + 1}>${headingMatch[2]}</h${level + 1}>`);
                    } else {
                        processedLines.push(`<p>${line}</p>`);
                    }
                }
            }
        }
        if (inList) processedLines.push(`</${listType}>`);

        return processedLines.join("\n");
    }

    /**
     * Create and append a message bubble to the chat.
     */
    function appendMessage(content, role) {
        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${role}-message`;

        const avatarDiv = document.createElement("div");
        avatarDiv.className = "message-avatar";
        
        // Gothic Custom SVG Avatars
        if (role === "user") {
            avatarDiv.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50 10 L80 25 L80 60 C80 75 50 90 50 90 C50 90 20 75 20 60 L20 25 Z" stroke="var(--text-secondary)" stroke-width="6" stroke-linejoin="round" fill="rgba(148, 163, 184, 0.15)"/>
                    <circle cx="50" cy="40" r="14" stroke="var(--text-secondary)" stroke-width="4"/>
                    <path d="M28 72 C28 60 38 52 50 52 C62 52 72 60 72 72" stroke="var(--text-secondary)" stroke-width="4" stroke-linecap="round"/>
                </svg>
            `;
        } else {
            avatarDiv.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50 10 L85 35 L85 70 L50 95 L15 70 L15 35 Z" stroke="var(--accent-crimson)" stroke-width="6" stroke-linejoin="round" fill="rgba(153, 27, 27, 0.25)"/>
                    <circle cx="50" cy="50" r="10" fill="var(--accent-crimson)"/>
                    <path d="M35 48 L45 52 L50 48" stroke="white" stroke-width="4" stroke-linecap="round"/>
                    <path d="M65 48 L55 52 L50 48" stroke="white" stroke-width="4" stroke-linecap="round"/>
                </svg>
            `;
        }

        const contentDiv = document.createElement("div");
        contentDiv.className = "message-content";

        if (role === "assistant") {
            renderBlocks(parseResponseToBlocks(content), contentDiv);
        } else {
            const p = document.createElement("p");
            p.textContent = content;
            contentDiv.appendChild(p);
        }

        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        messagesWrapper.appendChild(messageDiv);

        // Animate in
        requestAnimationFrame(function () {
            messageDiv.classList.add("visible");
        });

        // Scroll to bottom
        messagesWrapper.scrollTop = messagesWrapper.scrollHeight;
    }

    /**
     * Set the loading state of the UI.
     */
    function setLoading(loading) {
        isLoading = loading;
        loadingIndicator.classList.toggle("active", loading);
        sendButton.disabled = loading;
        messageInput.disabled = loading;

        if (loading) {
            messagesWrapper.scrollTop = messagesWrapper.scrollHeight;
        }
    }

    /**
     * Send the user's message to the API and display the response.
     */
    async function sendMessage(userMessage) {
        appendMessage(userMessage, "user");
        setLoading(true);

        // Create the assistant message element container for streaming
        const messageDiv = document.createElement("div");
        messageDiv.className = "message assistant-message";
        
        const avatarDiv = document.createElement("div");
        avatarDiv.className = "message-avatar";
        avatarDiv.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 10 L85 35 L85 70 L50 95 L15 70 L15 35 Z" stroke="var(--accent-crimson)" stroke-width="6" stroke-linejoin="round" fill="rgba(153, 27, 27, 0.25)"/>
                <circle cx="50" cy="50" r="10" fill="var(--accent-crimson)"/>
                <path d="M35 48 L45 52 L50 48" stroke="white" stroke-width="4" stroke-linecap="round"/>
                <path d="M65 48 L55 52 L50 48" stroke="white" stroke-width="4" stroke-linecap="round"/>
            </svg>
        `;
        
        const contentDiv = document.createElement("div");
        contentDiv.className = "message-content";
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        messagesWrapper.appendChild(messageDiv);
        
        // Show message bubble
        requestAnimationFrame(function () {
            messageDiv.classList.add("visible");
        });
        messagesWrapper.scrollTop = messagesWrapper.scrollHeight;

        let accumulatedResponse = "";

        try {
            // Disable smooth scrolling temporarily to prevent stutter/jitter during streaming
            messagesWrapper.style.scrollBehavior = "auto";

            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: userMessage,
                    session_id: sessionId,
                }),
            });

            if (!response.ok) {
                throw new Error(`Server returned HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop(); // Hold incomplete line

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line.startsWith("data: ")) continue;
                    
                    try {
                        const payload = JSON.parse(line.slice(6));
                        
                        if (payload.type === "metadata") {
                            sessionId = payload.session_id;
                            if (payload.anime_results) {
                                payload.anime_results.forEach(anime => {
                                    if (anime.mal_id) {
                                        animeMetadata[anime.mal_id.toString()] = anime;
                                    }
                                });
                            }
                            console.log("Metadata received:", payload);
                        } else if (payload.type === "token") {
                            accumulatedResponse += payload.text;
                            renderBlocks(parseResponseToBlocks(accumulatedResponse), contentDiv);
                            scrollToBottomIfNear();
                        } else if (payload.type === "error") {
                            throw new Error(payload.detail);
                        }
                    } catch (e) {
                        console.error("Failed to parse stream chunk:", line, e);
                    }
                }
            }
        } catch (error) {
            renderBlocks(parseResponseToBlocks(`⚠️ **Error:** ${error.message}. Please try again.`), contentDiv);
        } finally {
            setLoading(false);
            messageInput.focus();
            // Restore smooth scrolling for normal page operations
            messagesWrapper.style.scrollBehavior = "smooth";
        }
    }

    // Event listeners
    chatForm.addEventListener("submit", function (e) {
        e.preventDefault();

        if (isLoading) return;

        const message = messageInput.value.trim();
        if (!message) return;

        messageInput.value = "";
        sendMessage(message);
    });

    // Focus input on page load
    messageInput.focus();
})();

/**
 * AniBot Chat Application - Vanilla JS
 * Handles message sending, response rendering, and UI state management with persistent history.
 */

(function () {
    "use strict";

    // DOM Elements
    const layoutWrapper = document.getElementById("layout-wrapper");
    const sidebar = document.getElementById("sidebar");
    const sidebarToggle = document.getElementById("sidebar-toggle");
    const sidebarCloseBtn = document.getElementById("sidebar-close-btn");
    const sidebarBackdrop = document.getElementById("sidebar-backdrop");
    const newChatBtn = document.getElementById("new-chat-btn");
    const sessionsList = document.getElementById("sessions-list");
    const chatForm = document.getElementById("chat-form");
    const messageInput = document.getElementById("message-input");
    const sendButton = document.getElementById("send-button");
    const messagesWrapper = document.getElementById("messages-wrapper");
    const loadingIndicator = document.getElementById("loading-indicator");

    // State
    let sessionId = "";
    let isLoading = false;
    let animeMetadata = {}; // key: mal_id (string), value: anime object
    let sessions = []; // array of session objects: { id, title, timestamp, messages: [{role, content}] }

    /**
     * Parse the response text to extract [RECOMMENDATION] blocks and convert
     * them into rich Gothic-themed card components using loaded metadata.
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
     * Create and append a message bubble in the DOM (used for initial load and rendering state).
     */
    function appendMessageBubbleToDom(content, role) {
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
     * Renders the default welcome assistant message.
     */
    function renderInitialWelcome() {
        const messageDiv = document.createElement("div");
        messageDiv.className = "message assistant-message visible";
        
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
        contentDiv.innerHTML = `
            <p>Welcome, traveler of the anime realms. I am <strong>AniBot</strong>, your guide through the shadows of story and animation.</p>
            <p>Speak of the tales you wish to summon. For example:</p>
            <ul>
                <li>"I want something dark and psychological like Death Note"</li>
                <li>"Give me a fun comedy isekai"</li>
                <li>"Something emotional with great animation"</li>
            </ul>
            <p>What kind of anime are you looking for today? ⚔️</p>
        `;
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        messagesWrapper.appendChild(messageDiv);
        messagesWrapper.scrollTop = 0;
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
        // Find current session and push user message to history
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            session.messages.push({ role: "user", content: userMessage });
            // Generate title from message if it's the first one
            const userMessagesCount = session.messages.filter(m => m.role === "user").length;
            if (session.title === "New Summoning" || userMessagesCount === 1) {
                session.title = generateTitleFromMessage(userMessage);
            }
            saveSessions();
            renderSidebar();
        }

        // Render user message bubble in DOM
        appendMessageBubbleToDom(userMessage, "user");
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

        // Slice previous history to send (exclude the current message we just pushed)
        const historyToSend = session ? session.messages.slice(0, -1) : [];

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
                    history: historyToSend
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

            // Save completed assistant message to history
            if (session) {
                session.messages.push({ role: "assistant", content: accumulatedResponse });
                saveSessions();
            }

        } catch (error) {
            const errorMsg = `⚠️ **Error:** ${error.message}. Please try again.`;
            renderBlocks(parseResponseToBlocks(errorMsg), contentDiv);
            if (session) {
                session.messages.push({ role: "assistant", content: errorMsg });
                saveSessions();
            }
        } finally {
            setLoading(false);
            messageInput.focus();
            // Restore smooth scrolling for normal page operations
            messagesWrapper.style.scrollBehavior = "smooth";
        }
    }

    // --- History / Sessions Management Functions ---

    /**
     * Generate a UUID string for unique session tracking.
     */
    function generateUuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Truncate and clean user message to make a neat session title.
     */
    function generateTitleFromMessage(message) {
        if (!message) return "New Summoning";
        const clean = message.trim()
            .replace(/[#*`_\[\]]/g, "") // strip common markdown
            .replace(/\s+/g, " ")
            .substring(0, 30);
        return clean.length < message.trim().length ? clean + "..." : clean;
    }

    /**
     * Persist current state in client localStorage.
     */
    function saveSessions() {
        localStorage.setItem("anibot_sessions", JSON.stringify(sessions));
        localStorage.setItem("anibot_active_session_id", sessionId);
        localStorage.setItem("anibot_anime_metadata", JSON.stringify(animeMetadata));
    }

    /**
     * Create a brand new session object, register it, switch to it, and render the sidebar.
     */
    function createNewSession() {
        const newId = generateUuid();
        const newSession = {
            id: newId,
            title: "New Summoning",
            timestamp: new Date().toISOString(),
            messages: []
        };
        sessions.unshift(newSession);
        saveSessions();
        switchSession(newId);
        renderSidebar();
    }

    /**
     * Switch current conversation view to the specified session.
     */
    function switchSession(id) {
        sessionId = id;
        localStorage.setItem("anibot_active_session_id", sessionId);

        // Highlight active session item
        const items = sessionsList.querySelectorAll(".session-item");
        items.forEach(item => {
            if (item.getAttribute("data-session-id") === id) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        // Clear existing messages and populate this session's history
        const session = sessions.find(s => s.id === id);
        messagesWrapper.innerHTML = "";

        if (session && session.messages.length > 0) {
            session.messages.forEach(msg => {
                appendMessageBubbleToDom(msg.content, msg.role);
            });
        } else {
            renderInitialWelcome();
        }

        // Close sidebar on mobile views
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    }

    /**
     * Delete session from memory and localStorage. If active, switch to next available.
     */
    function deleteSession(id) {
        if (sessions.length <= 1) {
            // Wiping the only session instead of deleting
            const session = sessions[0];
            session.title = "New Summoning";
            session.timestamp = new Date().toISOString();
            session.messages = [];
            saveSessions();
            switchSession(session.id);
            renderSidebar();
            return;
        }

        const index = sessions.findIndex(s => s.id === id);
        if (index !== -1) {
            sessions.splice(index, 1);
            saveSessions();

            // Switch session if deleting current active
            if (id === sessionId) {
                const newActiveId = sessions[0].id;
                switchSession(newActiveId);
            }

            renderSidebar();
        }
    }

    /**
     * Render the list of session items inside the sidebar.
     */
    function renderSidebar() {
        sessionsList.innerHTML = "";

        sessions.forEach(session => {
            const item = document.createElement("div");
            item.className = "session-item";
            if (session.id === sessionId) {
                item.classList.add("active");
            }
            item.setAttribute("data-session-id", session.id);

            const info = document.createElement("div");
            info.className = "session-info";

            const title = document.createElement("span");
            title.className = "session-title";
            title.textContent = session.title;

            const date = new Date(session.timestamp);
            const meta = document.createElement("span");
            meta.className = "session-meta";
            meta.textContent = date.toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            info.appendChild(title);
            info.appendChild(meta);

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "session-delete-btn";
            deleteBtn.title = "Delete Summoning";
            deleteBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            `;

            deleteBtn.addEventListener("click", function (e) {
                e.stopPropagation();
                deleteSession(session.id);
            });

            item.appendChild(info);
            item.appendChild(deleteBtn);

            item.addEventListener("click", function () {
                if (session.id !== sessionId) {
                    switchSession(session.id);
                }
            });

            sessionsList.appendChild(item);
        });
    }

    // --- Sidebar Visibility Controls ---

    function toggleSidebar() {
        layoutWrapper.classList.toggle("sidebar-collapsed");
        sidebarBackdrop.classList.toggle("active");
    }

    function closeSidebar() {
        layoutWrapper.classList.add("sidebar-collapsed");
        sidebarBackdrop.classList.remove("active");
    }

    function openSidebar() {
        layoutWrapper.classList.remove("sidebar-collapsed");
        sidebarBackdrop.classList.add("active");
    }

    // --- Initialization ---

    function initSessions() {
        const stored = localStorage.getItem("anibot_sessions");
        if (stored) {
            try {
                sessions = JSON.parse(stored);
            } catch (e) {
                console.error("Failed to parse sessions:", e);
                sessions = [];
            }
        }
        
        const storedMetadata = localStorage.getItem("anibot_anime_metadata");
        if (storedMetadata) {
            try {
                animeMetadata = JSON.parse(storedMetadata);
            } catch (e) {
                console.error("Failed to parse anime metadata:", e);
                animeMetadata = {};
            }
        }

        // If no sessions, create a default first one
        if (sessions.length === 0) {
            createNewSession();
        } else {
            const lastActiveId = localStorage.getItem("anibot_active_session_id");
            const activeSession = sessions.find(s => s.id === lastActiveId) || sessions[0];
            switchSession(activeSession.id);
        }
        
        renderSidebar();

        // Collapse sidebar on initial load if screen size is mobile/tablet
        if (window.innerWidth <= 768) {
            closeSidebar();
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

    sidebarToggle.addEventListener("click", toggleSidebar);
    sidebarCloseBtn.addEventListener("click", closeSidebar);
    sidebarBackdrop.addEventListener("click", closeSidebar);
    newChatBtn.addEventListener("click", createNewSession);

    // Initialize application state
    initSessions();
    
    // Focus input
    messageInput.focus();
})();

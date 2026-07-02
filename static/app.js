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
        avatarDiv.textContent = role === "user" ? "👤" : "🤖";

        const contentDiv = document.createElement("div");
        contentDiv.className = "message-content";

        if (role === "assistant") {
            contentDiv.innerHTML = markdownToHtml(content);
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

        try {
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
                const errorData = await response.json().catch(function () {
                    return { detail: "Unknown server error" };
                });
                throw new Error(errorData.detail || `Server error: ${response.status}`);
            }

            const data = await response.json();
            sessionId = data.session_id;
            appendMessage(data.response, "assistant");
        } catch (error) {
            appendMessage(
                `⚠️ **Error:** ${error.message}. Please try again.`,
                "assistant"
            );
        } finally {
            setLoading(false);
            messageInput.focus();
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

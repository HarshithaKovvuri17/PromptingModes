document.addEventListener('DOMContentLoaded', () => {
    // Theme Toggle Handler (Symbol Only) - Global across all pages
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('promptcraft-theme', newTheme);
        });
    }

    const chatInput = document.getElementById('chat-input');
    if (!chatInput) return; // Not on dashboard

    const sendBtn = document.getElementById('send-btn');
    const chatHistory = document.getElementById('chat-history');
    const actionBtns = document.querySelectorAll('.action-btn');
    const taskTypeInput = document.getElementById('task-type');
    const currentModeBadge = document.getElementById('current-mode-badge');
    const errorMessage = document.getElementById('error-message');
    const referenceExampleCard = document.getElementById('reference-example-card');
    const referenceExampleText = document.getElementById('reference-example-text');
    const copyExampleBtn = document.getElementById('copy-example-btn');
    const copyBtnText = document.getElementById('copy-btn-text');
    const injectExampleBtn = document.getElementById('inject-example-btn');

    // Inject Reference Example into prompt input textarea
    if (injectExampleBtn && referenceExampleText && chatInput) {
        injectExampleBtn.addEventListener('click', () => {
            const textToInject = referenceExampleText.textContent.trim();
            if (textToInject) {
                chatInput.value = textToInject;
                chatInput.focus();
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
            }
        });
    }

    const dismissWelcomeBtn = document.getElementById('dismiss-welcome-btn');
    const botWelcomeBanner = document.getElementById('bot-welcome-banner');
    const welcomeChipBtns = document.querySelectorAll('.welcome-chip-btn');

    // Dismiss Welcome Banner Handler
    if (dismissWelcomeBtn && botWelcomeBanner) {
        dismissWelcomeBtn.addEventListener('click', () => {
            botWelcomeBanner.style.opacity = '0';
            botWelcomeBanner.style.transform = 'translateY(-10px)';
            botWelcomeBanner.style.transition = 'all 0.25s ease';
            setTimeout(() => {
                botWelcomeBanner.style.display = 'none';
            }, 250);
        });
    }

    // Auto-expand prompt textarea dynamically
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
    });

    // Centralized data structure for mode-specific configurations and reference examples
    const MODE_CONFIG = {
        structured: {
            badge: 'Mode: Structured Validation',
            example: 'List three benefits of daily exercise in a Markdown table with columns "Benefit" and "Description." Also include a bulleted list of 3 tips to get started.'
        },
        json: {
            badge: 'Mode: JSON / YAML Auto-Refinement',
            example: 'Generate information about three programming languages and return the result as valid JSON or YAML format with fields for name, creator, and year.'
        },
        cot: {
            badge: 'Mode: Chain-of-Thought Baseline',
            example: 'A farmer has 10 sheep, and all but 7 die. How many are left? Also, if he buys 5 more and gives half of his total flock to his neighbor, how many does he have?'
        },
        general: {
            badge: 'Mode: General Chat',
            example: null // No reference example in General mode
        }
    };

    // Handle Action Buttons (Mode Selection)
    actionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const isAlreadyActive = btn.classList.contains('active');

            // Remove active class from all buttons
            actionBtns.forEach(b => b.classList.remove('active'));

            let taskType = 'general';

            if (!isAlreadyActive) {
                // Activate clicked button
                btn.classList.add('active');
                taskType = btn.dataset.task;
            }

            taskTypeInput.value = taskType;
            const modeConfig = MODE_CONFIG[taskType] || MODE_CONFIG.general;

            // Manage Reference Example Card visibility
            if (taskType === 'general' || !modeConfig.example) {
                if (referenceExampleCard) referenceExampleCard.classList.add('hidden');
            } else {
                if (referenceExampleText) referenceExampleText.textContent = modeConfig.example;
                if (referenceExampleCard) referenceExampleCard.classList.remove('hidden');
            }

            // Update UI badge
            if (currentModeBadge) {
                const badgeTextSpan = currentModeBadge.querySelector('.badge-text');
                if (taskType === 'general') {
                    if (badgeTextSpan) badgeTextSpan.textContent = 'Mode: General Chat';
                    else currentModeBadge.textContent = 'Mode: General Chat';
                    currentModeBadge.className = 'badge badge-gray';
                } else {
                    if (badgeTextSpan) badgeTextSpan.textContent = modeConfig.badge;
                    else currentModeBadge.textContent = modeConfig.badge;
                    currentModeBadge.className = 'badge badge-primary';
                }
            }
            
            // Focus input area without populating reference example into textarea
            chatInput.focus();
        });
    });

    // Copy Reference Example to Clipboard
    if (copyExampleBtn && referenceExampleText) {
        copyExampleBtn.addEventListener('click', async () => {
            const textToCopy = referenceExampleText.textContent.trim();
            if (!textToCopy) return;

            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(textToCopy);
                } else {
                    // Fallback for older browsers
                    const tempTextArea = document.createElement('textarea');
                    tempTextArea.value = textToCopy;
                    document.body.appendChild(tempTextArea);
                    tempTextArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(tempTextArea);
                }

                if (copyBtnText) {
                    copyBtnText.textContent = 'Copied!';
                    copyExampleBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtnText.textContent = 'Copy';
                        copyExampleBtn.classList.remove('copied');
                    }, 2000);
                }
            } catch (err) {
                console.error('Failed to copy reference example:', err);
            }
        });
    }

    // Handle Enter key to send (Shift+Enter for newline)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendBtn.click();
        }
    });

    sendBtn.addEventListener('click', async () => {
        const prompt = chatInput.value.trim();
        const taskType = taskTypeInput.value;
        
        if (!prompt) return;

        // 1. Add User Message to DOM
        appendMessage(prompt, 'user');
        
        // 2. Reset input
        chatInput.value = '';
        errorMessage.classList.add('hidden');
        
        // 3. Show typing indicator
        const typingId = showTypingIndicator();
        
        // 4. Disable input
        chatInput.disabled = true;
        sendBtn.disabled = true;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt, task_type: taskType })
            });

            const data = await response.json();
            
            // Remove typing indicator
            document.getElementById(typingId)?.remove();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to generate response.');
            }

            // 5. Append Bot Response based on type
            if (data.type === 'cot') {
                appendCoTMessage(data.baseline_html, data.cot_html, data.status);
            } else {
                appendBotMessage(data.html, data.status, data.success);
            }

        } catch (error) {
            document.getElementById(typingId)?.remove();
            errorMessage.textContent = error.message;
            errorMessage.classList.remove('hidden');
        } finally {
            // Re-enable input
            chatInput.disabled = false;
            sendBtn.disabled = false;
            chatInput.focus();
        }
    });

    function appendMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `chat-bubble ${sender}-bubble`;
        div.textContent = text;
        chatHistory.appendChild(div);
        scrollToBottom();
    }

    function appendBotMessage(html, statusText, isSuccess) {
        const div = document.createElement('div');
        div.className = `chat-bubble bot-bubble markdown-body`;
        div.innerHTML = html;
        
        if (statusText) {
            const statusDiv = document.createElement('div');
            statusDiv.className = `status-bar ${isSuccess ? 'text-success' : 'text-error'}`;
            statusDiv.style.color = isSuccess ? 'var(--success-color)' : 'var(--error-color)';
            statusDiv.textContent = statusText;
            div.appendChild(statusDiv);
        }
        
        chatHistory.appendChild(div);
        scrollToBottom();
    }
    
    function appendCoTMessage(baselineHtml, cotHtml, statusText) {
        const div = document.createElement('div');
        div.className = `chat-bubble bot-bubble`;
        
        div.innerHTML = `
            <p>I have processed this prompt using two different methods to demonstrate Chain-of-Thought reasoning.</p>
            <div class="cot-comparison">
                <div class="cot-panel markdown-body">
                    <h4>Direct Answer (Baseline)</h4>
                    ${baselineHtml}
                </div>
                <div class="cot-panel markdown-body">
                    <h4>Chain-of-Thought (Reasoning)</h4>
                    ${cotHtml}
                </div>
            </div>
            <div class="status-bar" style="color: var(--success-color);">
                ${statusText}
            </div>
        `;
        
        chatHistory.appendChild(div);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const div = document.createElement('div');
        div.className = `chat-bubble bot-bubble`;
        div.id = id;
        div.innerHTML = `
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        chatHistory.appendChild(div);
        scrollToBottom();
        return id;
    }

    function scrollToBottom() {
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = "AIzaSyDKCOPVTAE5ArvAQjW24S5jWpcEd1r5wew";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${API_KEY}`;

    const chatHistoryElem = document.getElementById('chatHistory');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const typingIndicator = document.getElementById('typingIndicator');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const attachFileBtn = document.getElementById('attachFileBtn');
    const fileInput = document.getElementById('fileInput');
    const uploadedFilesPreview = document.getElementById('uploadedFilesPreview');
    const splashScreen = document.getElementById('splashScreen');

    let chatSession = []; // Stores conversation history for API requests
    let uploadedFiles = []; // Stores files selected by the user for the current message

    // Load session from localStorage
    function loadChatSession() {
        const savedSession = localStorage.getItem('matsanelaChatSession');
        if (savedSession) {
            chatSession = JSON.parse(savedSession);
            chatSession.forEach(message => {
                if (message.role === 'user' && message.parts) {
                    message.parts.forEach(part => {
                        if (part.text) {
                            displayMessage('user', part.text);
                        } else if (part.inlineData) {
                            displayMessage('user', part.inlineData.data, 'image');
                        }
                    });
                } else if (message.role === 'model' && message.parts) {
                    message.parts.forEach(part => {
                        if (part.text) {
                            displayMessage('ai', part.text);
                        }
                    });
                }
            });
        }
        scrollToBottom();
    }

    // Save session to localStorage
    function saveChatSession() {
        localStorage.setItem('matsanelaChatSession', JSON.stringify(chatSession));
    }

    // Display message in chat history
    function displayMessage(sender, content, type = 'text') {
        const templateId = sender === 'user' ? 'userMessageTemplate' : 'aiMessageTemplate';
        const template = document.getElementById(templateId);
        const clone = document.importNode(template.content, true);
        const bubbleContent = clone.querySelector('.bubble-content');

        if (type === 'text') {
            bubbleContent.textContent = content;
        } else if (type === 'image') {
            const img = document.createElement('img');
            img.src = content;
            img.alt = sender + ' image';
            bubbleContent.appendChild(img);
        }

        chatHistoryElem.appendChild(clone);
        scrollToBottom();
    }

    // Scroll chat to the bottom
    function scrollToBottom() {
        chatHistoryElem.scrollTop = chatHistoryElem.scrollHeight;
    }

    // Show/hide typing indicator
    function showTypingIndicator() {
        typingIndicator.classList.add('visible');
        scrollToBottom();
    }

    function hideTypingIndicator() {
        typingIndicator.classList.remove('visible');
    }

    // Send message to AI
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text && uploadedFiles.length === 0) return;

        const userParts = [];
        if (text) {
            userParts.push({ text: text });
        }
        uploadedFiles.forEach(file => {
            userParts.push({
                inlineData: {
                    mimeType: file.type,
                    data: file.base64
                }
            });
        });

        const userMessage = {
            role: 'user',
            parts: userParts
        };

        // Add user message to UI and session
        if (text) {
            displayMessage('user', text);
        }
        uploadedFiles.forEach(file => {
            displayMessage('user', file.base64, 'image');
        });
        chatSession.push(userMessage);
        saveChatSession(); // Save session after user message

        // Clear input and files
        chatInput.value = '';
        uploadedFiles = [];
        uploadedFilesPreview.innerHTML = '';
        uploadedFilesPreview.classList.remove('visible');
        adjustTextareaHeight(); // Reset textarea height

        showTypingIndicator();

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: chatSession // Send entire session history for context
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${response.status} - ${errorData.error ? errorData.error.message : 'Unknown error'}`);
            }

            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text;

            // Add AI message to UI and session
            displayMessage('ai', aiText);
            chatSession.push({
                role: 'model',
                parts: [{ text: aiText }]
            });
            saveChatSession(); // Save session after AI message

        } catch (error) {
            console.error('Error sending message:', error);
            displayMessage('ai', `Maaf, saya tidak bisa merespons saat ini. Terjadi kesalahan: ${error.message}`);
        } finally {
            hideTypingIndicator();
        }
    }

    // Adjust textarea height based on content
    function adjustTextareaHeight() {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
    }

    // Handle file attachment
    attachFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (event) => {
        const files = event.target.files;
        uploadedFiles = [];
        uploadedFilesPreview.innerHTML = '';

        if (files.length > 0) {
            uploadedFilesPreview.classList.add('visible');
            for (const file of files) {
                if (file.size > 5 * 1024 * 1024) { // Max 5MB per file
                    alert(`File "${file.name}" terlalu besar. Maksimum 5MB per file.`);
                    continue;
                }

                const reader = new FileReader();
                reader.readAsDataURL(file);

                reader.onload = () => {
                    const base64 = reader.result.split(',')[1];
                    uploadedFiles.push({
                        name: file.name,
                        type: file.type,
                        base64: base64
                    });

                    // Create preview element
                    const previewItem = document.createElement('div');
                    previewItem.classList.add('file-preview-item');
                    if (file.type.startsWith('image/')) {
                        const img = document.createElement('img');
                        img.src = reader.result;
                        previewItem.appendChild(img);
                    } else {
                        // For non-image files, display a generic icon or text
                        const icon = document.createElement('span');
                        icon.textContent = '📄'; // Generic file icon
                        icon.style.marginRight = '5px';
                        previewItem.appendChild(icon);
                    }
                    const fileNameSpan = document.createElement('span');
                    fileNameSpan.textContent = file.name;
                    previewItem.appendChild(fileNameSpan);

                    const removeBtn = document.createElement('button');
                    removeBtn.classList.add('remove-file-btn');
                    removeBtn.innerHTML = '&times;';
                    removeBtn.title = `Hapus ${file.name}`;
                    removeBtn.addEventListener('click', () => {
                        uploadedFiles = uploadedFiles.filter(f => f.name !== file.name);
                        previewItem.remove();
                        if (uploadedFiles.length === 0) {
                            uploadedFilesPreview.classList.remove('visible');
                        }
                    });
                    previewItem.appendChild(removeBtn);
                    uploadedFilesPreview.appendChild(previewItem);
                };
                reader.onerror = (error) => {
                    console.error("Error reading file:", error);
                };
            }
        } else {
            uploadedFilesPreview.classList.remove('visible');
        }
    });

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault(); // Prevent new line
            sendMessage();
        }
    });
    chatInput.addEventListener('input', adjustTextareaHeight);

    clearChatBtn.addEventListener('click', () => {
        // Clear UI only, keep session for context
        chatHistoryElem.innerHTML = `
            <div class="ai-bubble intro-bubble bubble-animation">
                Hai! Saya Matsanela AI, siap membantumu belajar. Ada yang bisa saya bantu?
            </div>
        `;
        scrollToBottom();
        // chatSession array and localStorage remain untouched
    });

    // Splash screen animation
    function hideSplashScreen() {
        splashScreen.classList.add('fade-out');
        setTimeout(() => {
            splashScreen.remove();
        }, 1000); // Wait for fade-out transition
    }

    // Initial load
    setTimeout(() => {
        hideSplashScreen();
        loadChatSession();
    }, 2000); // Show splash for 2 seconds
});
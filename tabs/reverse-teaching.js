const { ipcRenderer } = require('electron');

function initReverseTeaching() {
  const MINIMAX_API_KEY = 'sk-api-PdXV6pPmAj9yASBU2aWZDPz7YMgdPq9r68zUKB-OuiyiRdlVlCsxYxiCw1untrVlMN8ojo4YFyGmyVhuroAJnGFNGAbf_s9clvK3D4MQJv658EdEH3aWsN0';
  let currentTopic = '';
  let chatHistory = [];

  const mainNav = document.getElementById('mainNav');
  const chatInputArea = document.getElementById('chatInputArea');
  const screens = document.querySelectorAll('.screen');
  const topicInput = document.getElementById('topicInput');
  const explanationInput = document.getElementById('explanationInput');
  const feedbackContent = document.getElementById('feedbackContent');
  const chatInput = document.getElementById('chatInput');
  const feedbackLoading = document.getElementById('feedbackLoading');

  // Redefine internal showScreen/showNav to work within the module or use globals
  // Since we're in a module-like structure, we should be careful with global scope
  // But init() is called after index.html is loaded, so we can access everything.

  window.showScreen = function(screenId) {
    if (mainNav) mainNav.style.display = 'none';
    screens.forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId === 'topicScreen') {
      ipcRenderer.send('set-window-height', 250);
    } else if (screenId === 'explanationScreen') {
      ipcRenderer.send('set-window-height', 330);
    } else { // feedbackScreen
      ipcRenderer.send('set-window-height', 570);
    }
  };

  window.showNav = function() {
    if (mainNav) mainNav.style.display = 'flex';
    screens.forEach(s => s.classList.remove('active'));
    if (chatInputArea) chatInputArea.style.display = 'none';
    ipcRenderer.send('set-window-height', 500);
  };

  function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg msg-${role === 'user' ? 'user' : 'ai'}`;
    msgDiv.textContent = text;
    feedbackContent.appendChild(msgDiv);
    feedbackContent.scrollTop = feedbackContent.scrollHeight;
  }

  function filterResponse(text) {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  }

  document.getElementById('submitTopicBtn').addEventListener('click', () => {
    currentTopic = topicInput.value.trim();
    if (currentTopic) {
      window.showScreen('explanationScreen');
    }
  });

  async function callMinimax() {
    feedbackLoading.style.display = 'flex';

    try {
      const response = await fetch('https://api.minimax.io/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MINIMAX_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'MiniMax-M2.1-highspeed',
          messages: [
            {
              role: 'system',
              content: "Evaluate the user's explanation of the topic they provided. If the explanation is mostly correct or close to being correct, respond in a supportive tone without giving lengthy feedback. Only provide detailed feedback if the user’s answer is missing critical information or if their explanation contains major errors. At the end of your response, ask the user if they would like to continue discussing the current topic or if they would prefer to explore a new topic. Be sure to keep your tone friendly, supportive, and encouraging, even when pointing out areas for improvement. IMPORTANT: OUTPUT ONLY THE DIRECT RESPONSE. DO NOT INCLUDE <think> TAGS, XML TAGS, INTERNAL THOUGHTS, OR ANY METADATA. GENERALLY KEEP RESPONSES BRIEF."
            },
            ...chatHistory
          ]
        })
      });

      feedbackLoading.style.display = 'none';

      if (!response.ok) {
        const errorText = await response.text();
        appendMessage('ai', `API Error (${response.status}): ${errorText.substring(0, 100)}...`);
        return;
      }

      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const fullText = data.choices[0].message.content;
        const cleanedText = filterResponse(fullText);
        
        chatHistory.push({ role: 'assistant', content: cleanedText });
        appendMessage('ai', cleanedText);
        
        // Show chat input after first feedback
        chatInputArea.style.display = 'flex';
      } else {
        appendMessage('ai', "Error: Unexpected response format.");
      }
    } catch (error) {
      feedbackLoading.style.display = 'none';
      appendMessage('ai', "Connection error. Please try again.");
      console.error(error);
    }
  }

  document.getElementById('submitExplanationBtn').addEventListener('click', async () => {
    const explanation = explanationInput.value.trim();
    if (!explanation) return;

    window.showScreen('feedbackScreen');
    feedbackContent.innerHTML = '';
    chatHistory = [{ role: 'user', content: `Topic: ${currentTopic}\nExplanation: ${explanation}` }];

    // Log to learning memory
    ipcRenderer.send('save-study-event', {
      source: 'reverse_teaching',
      topics: [currentTopic],
      summary: `Practiced explaining "${currentTopic}" via reverse teaching`
    });

    await callMinimax();
  });

  document.getElementById('sendChatBtn').addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    chatHistory.push({ role: 'user', content: text });
    appendMessage('user', text);
    
    await callMinimax();
  });

  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') document.getElementById('sendChatBtn').click();
  });

  document.getElementById('feedbackBackBtn').addEventListener('click', () => {
    window.showScreen('explanationScreen');
  });

  // === Flashcard Modal Logic ===
  const fcModal = document.getElementById('flashcardModal');
  const openFcModalBtn = document.getElementById('openFcModalBtn');
  const cancelFcBtn = document.getElementById('cancelFcBtn');
  const generateFcBtn = document.getElementById('generateFcBtn');
  const fcMsgCountInput = document.getElementById('fcMsgCount');
  const msgCountLabel = document.getElementById('msgCountLabel');

  openFcModalBtn.addEventListener('click', () => {
    const n = chatHistory.length;
    fcMsgCountInput.max = n;
    fcMsgCountInput.value = Math.min(10, n);
    msgCountLabel.textContent = `MESSAGES TO INCLUDE (1-${n})`;
    fcModal.style.display = 'flex';
  });

  cancelFcBtn.addEventListener('click', () => {
    fcModal.style.display = 'none';
  });

  generateFcBtn.addEventListener('click', async () => {
    const deckName = document.getElementById('fcDeckName').value.trim() || 'Study Session';
    const cardCount = parseInt(document.getElementById('fcCardCount').value) || 5;
    const msgCount = parseInt(document.getElementById('fcMsgCount').value) || 5;

    // Get last N messages for context
    const transcript = chatHistory.slice(-msgCount)
      .map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`)
      .join('\n');

    generateFcBtn.disabled = true;
    generateFcBtn.textContent = 'Generating...';

    const result = await ipcRenderer.invoke('generate-flashcards', {
      deckName,
      cardCount,
      transcript
    });

    generateFcBtn.disabled = false;
    generateFcBtn.textContent = 'Generate';

    if (result.success) {
      alert(`Successfully generated ${result.addedCount} cards for "${deckName}"!`);
      fcModal.style.display = 'none';
      // Open viewer to show them
      ipcRenderer.send('open-flashcards-viewer');
    } else {
      alert('Generation failed: ' + result.error);
    }
  });
}

module.exports = { initReverseTeaching };

const { ipcRenderer } = require('electron');

const MINIMAX_API_KEY = 'sk-api-2Jjgnmytz_ZH7aiIl_0ICkmqSkgYXfWO35ck4atu3Ujcyjv0Bu9ZyUN3wOaBYJnjmkeKHqmath7wFUJKsxCmGMc01QE8tUcPnm_I3ulK_x3s4gMaMOcSLQA';

function initActiveRecall() {
  const arInputView = document.getElementById('ar-input-view');
  const arLoading = document.getElementById('ar-loading');
  const arNotes = document.getElementById('arNotes');
  const arGenerateBtn = document.getElementById('arGenerate');
  const arResumeBtn = document.getElementById('arResume');

  // Check for saved questions and show resume button
  ipcRenderer.invoke('get-saved-questions').then(saved => {
    if (saved && saved.length > 0) {
      arResumeBtn.style.display = 'block';
    }
  });

  // Also listen for saved questions loaded on startup
  ipcRenderer.on('saved-questions-loaded', (_, questions) => {
    if (questions && questions.length > 0) {
      arResumeBtn.style.display = 'block';
    }
  });

  // Test ninja button
  document.getElementById('arTestNinja').addEventListener('click', () => {
    ipcRenderer.send('test-ninja');
  });

  // Resume saved questions
  arResumeBtn.addEventListener('click', async () => {
    const saved = await ipcRenderer.invoke('get-saved-questions');
    if (saved && saved.length > 0) {
      ipcRenderer.send('open-quiz', saved);
    }
  });

/* Removed PDF picker listener - handled by sidebar now */

  // Generate questions and open quiz overlay
  arGenerateBtn.addEventListener('click', async () => {
    const notes = arNotes.value.trim();
    if (!notes) return;

    arInputView.style.display = 'none';
    arLoading.style.display = 'block';

    try {
      const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + MINIMAX_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'MiniMax-M2',
          messages: [
            {
              role: 'system',
              content: 'You are a study assistant. Given study notes, generate 5 question-answer pairs for active recall practice. Return ONLY a JSON array with objects having "question" and "answer" keys. No markdown, no explanation, just the JSON array.'
            },
            { role: 'user', content: notes }
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      const data = await res.json();
      const text = data.choices[0].message.content.trim();
      const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const questions = JSON.parse(jsonStr);

      arLoading.style.display = 'none';
      arInputView.style.display = 'flex';
      arResumeBtn.style.display = 'block';

      // Open quiz overlay
      ipcRenderer.send('open-quiz', questions);

      // Save questions and start recall timer
      ipcRenderer.send('start-recall-timer', questions);
    } catch (err) {
      console.error(err);
      arLoading.style.display = 'none';
      arInputView.style.display = 'flex';
      alert('Failed to generate questions. Check your connection and try again.');
    }
  });
}

module.exports = { initActiveRecall };

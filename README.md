# <img src="mov/cover.png" width="120" align="center" style="border-radius:12px"/> Bearly

*A cognitive-science-backed desktop AI that turns passive studying into a personalised metacognitive loop.*

**Most students study longer, not smarter.** They re-read notes, watch lectures on 2x speed, and convince themselves they understand — until the exam.

Bearly fixes that. It is a persistent desktop AI companion that sits on top of your workspace and forces active engagement with the material: you explain concepts, get diagnosed on your gaps, and drill the exact things you don't know — all without leaving your document. And unlike any other study tool, **it remembers you** — building a hyper-personalised learning profile that gets smarter with every session.

> **The result:** a metacognitive study loop that builds genuine understanding, not just exam confidence.

## Why Bearly?

| Problem | Bearly's Solution |
|---|---|
| Passive re-reading feels productive but isn't | Teach-the-AI mode reveals what you *actually* understand |
| Generic AI tools don't know your weaknesses | Learning Memory builds a persistent profile — your strengths, struggles, and study style — that deepens with every session |
| Flashcards are tedious to make | One click generates AI flashcards from your study session |
| Pomodoro apps don't stop you opening YouTube | Built-in distraction detection nudges you back in real time |
| Study tools live in a separate tab you have to switch to | Bearly stays on-screen, above your work, always one glance away |
| No one helps you plan *how* to study | Voice AI structures your session around your goals and schedule |
| Study tools ignore how you're actually feeling | Bearly reads your mood and adapts its tone and approach accordingly |

## The Science Behind Bearly

Every core feature in Bearly is grounded in peer-reviewed cognitive science:

| Technique | Research Backing | Bearly Feature |
|---|---|---|
| **Retrieval Practice** | Testing yourself on material improves long-term retention by up to **50%** vs re-reading *(Roediger & Karpicke, 2006, Science)* | Active Recall, Ninja question pop-ups |
| **The Feynman Technique** | Explaining a concept in simple terms is one of the most effective ways to identify gaps in understanding | Reverse Teaching |
| **Spaced Repetition** | Distributing practice over time reduces forgetting by following the forgetting curve *(Ebbinghaus, 1885; Cepeda et al., 2006)* | Exam calendar reminders, flashcard system |
| **Metacognition** | Students who track their own knowledge gaps and adapt their study strategies consistently outperform peers *(Flavell, 1979; Dunlosky et al., 2013)* | Learning Memory profile |
| **Focused Work + Break Cycles** | Short, timed work sessions maintain cognitive performance and reduce mental fatigue *(Ariga & Lleras, 2011)* | Pomodoro Timer |

## Features

- **Pomodoro Timer** — Focus sessions with auto-hide sidebar, mini floating mode, and live distraction detection
- **Active Recall** — Generate quiz questions from your notes and test yourself with spaced repetition reminders
- **Reverse Teaching** — Explain concepts to the AI; it gives feedback, identifies gaps, and can generate flashcards from your session
- **Flashcards** — In-house deck management system:
  - Dedicated viewer window with flip animations and Next/Back navigation
  - Create decks and manually add cards via text input
  - AI-generate flashcards from any Reverse Teaching session using MiniMax
  - All cards stored persistently in `flashcards.json`
- **Study Assistant** — AI study buddy that:
  - Has conversations to **plan and structure your study session** around your goals
  - **Reads your mood** and adapts its tone, pace, and suggestions accordingly
  - Pops up random questions every 10 minutes during study sessions
  - Voice chat powered by ElevenLabs
  - Detects distractions (nudges you when visiting YouTube, social media, etc.)
  - Dock companion that stays visible at all times
- **Calendar** — Track exams with spaced repetition reminders (14, 7, 3, 1 days before)
- **PDF Upload** — Load PDF content as study material for quizzes and voice context
- **Learning Memory** — A metacognitive learning profile that hyper-personalises Bearly over time:
  - After every session, AI extracts and classifies what you studied, where you struggled, and how you learn best
  - Tracks: *subjects covered, conceptual strengths, knowledge gaps, preferred study approach, and energy patterns*
  - This profile is injected into every future AI interaction — so Bearly already knows you before you say a word
  - Grounded in metacognition research: students aware of their own learning gaps significantly outperform those who aren't *(Dunlosky et al., 2013)*
  - Similar in concept to ChatGPT Memory, but purpose-built for studying: the more you use it, the more tailored every response becomes

## Getting Started

### Prerequisites

- **[Node.js](https://nodejs.org/)** v18 or higher
- **[ElevenLabs](https://elevenlabs.io/)** API key — for the voice Study Assistant
- **[MiniMax](https://api.minimax.io/)** API key — for AI feedback, flashcard generation, and learning memory

### Setup

**1. Clone the repository**
```bash
git clone https://github.com/gust10/studyyyy.git
cd studyyyy
```

**2. Install dependencies**
```bash
npm install
```

**3. Add your API keys**

Open `main.js` and replace the placeholder values near the top of the file:
```js
const MINIMAX_API_KEY = 'your-minimax-key-here';
const ELEVENLABS_API_KEY = 'your-elevenlabs-key-here';
const ELEVENLABS_AGENT_ID = 'your-agent-id-here';
```

**4. Launch Bearly**
```bash
npm start
```

> **Tip:** Bearly is optimised for macOS. The app will anchor to the left edge of your screen and auto-hide after a few seconds of inactivity — hover over the edge to bring it back.


## Project Structure

```
├── main.js                 # Electron main process, window management, IPC handlers
├── index.html              # Main sidebar UI
├── styles.css              # Global styles
├── quiz.html               # Quiz overlay
├── ninja.html              # Ninja popup (random questions)
├── ninja-dock.html         # Dock companion
├── ninja-chat.html         # Voice chat window
├── pomodoro.html           # Pomodoro timer
├── calendar.html           # Exam calendar
├── blur-overlay.html       # Fullscreen distraction overlay
├── flashcards-viewer.html  # Flashcard deck viewer window
├── flashcards.json         # Flashcard deck and card data
└── tabs/
    ├── active-recall.js
    ├── reverse-teaching.js
    └── reverse-teaching.html
```

## Data Storage

User data (questions, exams, learning memory, flashcards) is stored in the app's user data directory:

- **Windows:** `%APPDATA%/Bearly/Bearly-data/`
- **macOS:** `~/Library/Application Support/Bearly/Bearly-data/`

## Supported Platforms

- macOS **(highly recommended)**
- Windows

Distraction detection uses platform-specific APIs (PowerShell on Windows, AppleScript on macOS).

## License

ISC

## Team Members
* Kei Jonathan McCall-Pohl - Software Development
* Maddalena Di Salvo - Software Development
* Hyunsung Shin - Software Development
* Prajitno Fiona Keira - Design
* Yash Relekar - Design

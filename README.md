# <img src="mov/cover.png" width="120" align="center" style="border-radius:12px"/> Bearly

**Most students study longer, not smarter.** They re-read notes, watch lectures on 2x speed, and convince themselves they understand — until the exam.

Bearly fixes that. It is a persistent desktop AI companion that sits on top of your workspace and forces active engagement with the material: you explain concepts, get diagnosed on your gaps, and drill the exact things you don't know — all without leaving your document.

> **The result:** less passive re-reading, fewer surprises on exam day, and a study session that actually builds long-term memory.

## Why Bearly?

| Problem | Bearly's Solution |
|---|---|
| Passive re-reading feels productive but isn't | Teach-the-AI mode reveals what you *actually* understand |
| Generic AI tools don't know your weaknesses | Learning Memory builds a profile from every session |
| Flashcards are tedious to make | One click generates AI flashcards from your study session |
| Pomodoro apps don't stop you opening YouTube | Built-in distraction detection nudges you back in real time |
| Study tools live in a separate tab you have to switch to | Bearly stays on-screen, above your work, always one glance away |
| No one helps you plan *how* to study | Voice AI structures your session around your goals and schedule |
| Study tools ignore how you're actually feeling | Bearly reads your mood and adapts its tone and approach accordingly |

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
- **Learning Memory** — Builds a profile from your conversations (subjects, strengths, struggles, learning style)

## Requirements

- Node.js
- API keys for:
  - [ElevenLabs](https://elevenlabs.io/) (voice chat)
  - [MiniMax](https://api.minimax.io/) (AI summarization, memory extraction, and flashcard generation)

## Installation

```bash
npm install
```

## Running

```bash
npm start
```

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

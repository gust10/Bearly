# studyyyy
**Project Overview:**
AI Study Buddy is a persistent desktop-based AI companion that remains visually present on top of a user’s document workspace. It functions as an interactive academic assistant and behavioral productivity system.
 
Unlike traditional AI tools that operate as separate applications, this solution integrates directly into the study environment. The AI is accessible in real time while the user reads, writes, reviews, or studies.

CleverCub makes you smarter by making you teach it first—then targets your gaps with precision practice. Built in under 24 hours, it is an AI tool that measures understanding, not just answers; converts weak spots into wins using Feynman‑style active recall.

Differentiators:
Teach‑the‑AI workflow: you explain; it diagnoses.
Gap taxonomy: conceptual vs procedural vs calculation and more.
Adaptive drills: right difficulty, right format, right moment.
Anti‑distraction design: short, satisfying loops; focus‑friendly UI.

The core objective is to transform passive studying into an active, structured, and reflective learning process.

## Showcase

Demo videos from the app (Ninja assistant animations and feedback):

https://github.com/user-attachments/assets/2401e1c5-27b9-4a0f-b859-d0e6f58662c5

https://github.com/user-attachments/assets/ef36ce86-276b-4bf0-a7d3-120cb231ac48

https://github.com/user-attachments/assets/dfdac504-eb3e-451b-b808-2330c5646b71

![Cover](mov/cover.png)

## Features

- **Pomodoro Timer** — Focus sessions with auto-hide sidebar and distraction detection
- **Active Recall** — Generate quiz questions from your notes and test yourself
- **Reverse Teaching** — Explain concepts to reinforce learning
- **Flashcards** — Create and manage flashcards
- **Ninja Assistant** — AI study buddy that:
  - Pops up random questions every 10 minutes during study sessions
  - Voice chat powered by ElevenLabs
  - Distraction detection (nudges when you visit YouTube, social media, etc.)
  - Dock companion that stays visible
- **Calendar** — Track exams with spaced repetition reminders (14, 7, 3, 1 days before)
- **PDF Upload** — Load PDF content as study material for quizzes and voice context
- **Learning Memory** — Builds a profile from your conversations (subjects, strengths, struggles, learning style)

## Requirements

- Node.js
- API keys for:
  - [ElevenLabs](https://elevenlabs.io/) (voice chat)
  - [MiniMax](https://api.minimax.io/) (AI summarization and memory extraction)

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
├── main.js           # Electron main process, window management, IPC handlers
├── index.html        # Main sidebar UI
├── styles.css        # Global styles
├── quiz.html         # Quiz overlay
├── ninja.html        # Ninja popup (random questions)
├── ninja-dock.html   # Dock companion
├── ninja-chat.html   # Voice chat window
├── pomodoro.html     # Pomodoro timer
├── calendar.html     # Exam calendar
└── tabs/
    ├── pomodoro.js
    ├── active-recall.js
    ├── reverse-teaching.js
    └── flashcards.js
```

## Data Storage

User data (questions, exams, learning memory) is stored in the app's user data directory:

- **Windows:** `%APPDATA%/studyyyy/studyyyy-data/`
- **macOS:** `~/Library/Application Support/studyyyy/studyyyy-data/`

## Supported Platforms

- Windows
- macOS

Distraction detection uses platform-specific APIs (PowerShell on Windows, AppleScript on macOS).

## License

ISC

## Team Members
* Kei Jonathan McCall-Pohl - Software Development
* Maddalena Di Salvo - Software Development
* Hyunsung Shin - Software Development
* Prajitno Fiona Keira - Design
* Yash Relekar - Design

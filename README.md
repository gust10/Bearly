# studyyyy
**Project Overview:**
A desktop study companion built with Electron. Combines Pomodoro timers, active recall, flashcards, and an AI-powered "Ninja" assistant to help you study smarter.

## Team Members
* Kei Jonathan McCall-Pohl - Software Development
* Maddalena Di Salvo - Software Development
* Hyunsung Shin - Software Development
* Fiona Keira - Design
* Yash Relekar - Design

## Showcase

Demo vide

https://github.com/user-attachments/assets/52dec65b-2291-44c0-ae49-d8cbbf3c1e14

os from the app (Ninja assistant animations and feedback):

| | |
|---|---|
| **Idle / breathing** | **Talking (voice active)** |
| [breathing.mov](mov/breathing.mov) | [talking-bear.mov](mov/talking-bear.mov) |
| **Thinking** | **Scratch head** |
| [thinking-bear.mov](mov/thinking-bear.mov) | [scratch-head.mov](mov/scratch-head.mov) |
| **Glasses** | **Confetti (Pomodoro done)** |
| [glasses.mov](mov/glasses.mov) |

https://github.com/user-attachments/assets/89a540b0-e023-4328-8ced-29f656397c3b


https://github.com/user-attachments/assets/bc3da227-f5d0-4b71-8170-08369bb8bfda


https://github.com/user-attachments/assets/25ce9772-2f8a-4f03-be39-545e3fca450e



 [confetti.mov](mov/confetti.mov) |

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

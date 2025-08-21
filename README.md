# 🤖 DaveBot: Discord Voice Assistant

A modern Discord bot that brings together real-time voice command recognition, Google Cloud Text-to-Speech, and Google Gemini AI for conversational and gaming responses. DaveBot listens in voice channels, transcribes speech, responds to commands, and provides friendly commentary on Magic: The Gathering cards and more.

## 🚀 Features

- **Real-Time Voice Command Recognition**: Listens in Discord voice channels and transcribes speech using Wit.ai.
- **Text-to-Speech (TTS) Playback**: Responds with natural audio using Google Cloud TTS (cost-effective STANDARD voices).
- **Conversational AI**: Uses Google Gemini AI for complex, human-like responses and game commentary.
- **MTG Card Commentary**: Fetches random Magic: The Gathering cards and provides AI-powered analysis and spoken feedback.
- **Music Queue System**: Plays YouTube and local audio tracks with priority queue management.
- **Customizable Light Controls**: Integrates with Yeelight smart lights for fun effects.
- **Modular ES Module Codebase**: Clean, maintainable, and easy to extend.

## 🚀 Highlights

- Real-time voice capture and transcription (Wit.ai)
- Conversational responses and tag-prediction using Google Gemini / Vertex
- Natural-sounding TTS via ElevenLabs (configurable voice)
- Chat and command handlers for MTG card commentary, music playback, and more
- Modular ES module codebase designed for easy extension
<img width="701" height="496" alt="Untitled Diagram drawio" src="https://github.com/user-attachments/assets/a874128c-12e9-4482-9912-b4b0615061de" />

## 🛠️ Technology Stack

- Runtime: Node.js (v18+)
- Discord API: discord.js (v14+)
- Voice & Audio: @discordjs/voice, prism-media, fluent-ffmpeg, ffmpeg-static
- Speech Recognition: Wit.ai (HTTP API)
- Conversational AI / LLM: Google Gemini (Vertex) via the generative AI SDK
- Text-to-Speech (TTS): ElevenLabs API (configured in `voice/ttsHandler.js`)
- Music Playback: YouTube APIs / play-dl
- Optional Smart Lights: Yeelight integrations

## 📋 Prerequisites

- Node.js v18+ and npm or yarn
- Discord bot token and a voice channel to join
- Wit.ai API key
- Google Gemini (Vertex) API key / Google application credentials
- ElevenLabs API key and a voice ID
- ffmpeg installed or use the included `ffmpeg-static` package


Note: The project previously experimented with other TTS providers; the current default implementation uses ElevenLabs. Update `voice/ttsHandler.js` if you prefer a different provider.

## 🔧 Installation

1. Clone the repository

```powershell
git clone <repository-url>
cd davebot
```

2. Install dependencies

```powershell
npm install
# or
yarn install
```

3. Configure environment variables

Copy `.env.example` to `.env` (or create `.env`) and set the required keys. Common variables used in this repo:

- ROOMKEY: Discord bot token
- VOICEROOM: Voice channel ID to auto-join
- WITAIKEY: Wit.ai API key
- GEMINI_API_KEY: Google Gemini / Vertex API key
- GOOGLE_PROJECT_ID / GOOGLE_APPLICATION_CREDENTIALS: (if using Vertex with service account)
- VERTEX_MODEL: Vertex model id (e.g., `gemini-2.5-flash-lite`)
- ELEVENLABS_API_KEY: ElevenLabs API key
- ELEVENLABS_VOICE_ID: Preferred ElevenLabs voice ID
- YOUTUBEKEY: YouTube Data API key (for music commands)

Example `.env` snippet:

```properties
ROOMKEY=your-discord-bot-token
VOICEROOM=your-voice-channel-id
WITAIKEY=your-witai-key
GEMINI_API_KEY=your-gemini-key
VERTEX_MODEL=gemini-2.5-flash-lite
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_VOICE_ID=your-voice-id
YOUTUBEKEY=your-youtube-key
```

4. Optional: place Google service account JSON where `GOOGLE_APPLICATION_CREDENTIALS` points if you use Vertex with service account auth.

## 🚀 Running the Bot

Start the bot:

```powershell
npm start
# or
yarn start
```

Expected logs on success:

```
Bot is online.
Running on port 3000.
Joined voice channel: <channel-name>
```

## 📖 Quick Usage

- Say “Dave” or trigger voice commands in a voice channel to get a spoken response.
- Chat commands like `!dave mtg` fetch MTG cards and produce AI analysis + TTS playback.
- Music commands queue YouTube links via the bot's priority queue.

## 🏗️ Architecture Overview

- `voice/VoiceHandler` — manages Discord voice connections, recording, and streaming audio to ASR.
- `voice/ttsHandler.js` — ElevenLabs-based TTS implementation and usage tracking.
- `ai/geminiAIHandler.js` — tag-prediction (Gemini) and Vertex-style final response generation.
- `helpers/aiUtils.js` — response cleaning, tag helpers, and utility functions.
- `modals/*` — modular response templates for MTG, generic replies, help, etc.
- `PriorityQueue` — ensures conversational replies don't get interrupted by music playback.

## 🐛 Troubleshooting

- Bot not joining voice channel: verify `VOICEROOM` ID and bot permissions to connect/speak.
- TTS failing: check `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` and inspect `voice/ttsHandler.js` logs.
- Gemini/Vertex errors: verify `GEMINI_API_KEY`, `VERTEX_MODEL`, and Google service account setup if used.
- ASR (Wit.ai) issues: confirm `WITAIKEY` and that audio is sent as WAV.
- Audio playback issues: ensure ffmpeg is installed or use `ffmpeg-static`.

## 🤝 Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit and push
4. Open a pull request describing your changes

Please run lint/tests (if added) and keep changes modular.

## 📄 License

This project is licensed under the MIT License — see the `LICENSE` file.

## 🙏 Acknowledgments

- discord.js — Discord API wrapper
- Google Gemini / Vertex — LLM capabilities
- Wit.ai — Speech-to-text
- ElevenLabs — Text-to-speech
- Many open-source libraries used for audio and media handling

---

If you want, I can also add a short troubleshooting section that captures developer-focused debug steps (enable DEBUG logs for AI responses, inspect `result` shapes, etc.).

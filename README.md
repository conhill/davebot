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

## 🛠️ Technology Stack

- **Backend**: Node.js (Discord.js v14+, Express)
- **Voice & Audio**: @discordjs/voice, fluent-ffmpeg, prism-media
- **Speech Recognition**: Wit.ai API
- **Text-to-Speech**: Google Cloud TTS
- **Conversational AI**: Google Gemini AI
- **Music Playback**: play-dl, YouTube API
- **Smart Lights**: yeelight-awesome

## 📋 Prerequisites

- Node.js v18+ and npm/yarn
- Discord bot token and server setup
- Google Cloud project with TTS API enabled
- Gemini API key from Google AI Studio
- Wit.ai API key
- (Optional) Yeelight smart lights for light control

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd davebot
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env` and fill in your keys:
     ```
     ROOMKEY=your-discord-bot-token
     VOICEROOM=your-voice-channel-id
     GOOGLE_PROJECT_ID=your-google-project-id
     GOOGLE_APPLICATION_CREDENTIALS=./dave-bot-creds.json
     GEMINI_API_KEY=your-gemini-api-key
     WITAIKEY=your-wit-ai-key
     YOUTUBEKEY=your-youtube-api-key
     ```

4. **Set up Google Cloud credentials**
   - Download your service account key and place it as specified in `.env`.

## 🚀 Running the Bot

1. **Start the bot**
   ```bash
   npm start
   # or
   yarn start
   ```

2. **Bot Output**
   ```
   Bot is online.
   Running on port 3000.
   Joined voice channel: <channel-name>
   Modern voice connection established
   ```

## 📖 Command & Feature Overview

### Voice Commands

- Say “Dave” in a voice channel to trigger bot responses.
- Simple commands: “dave play”, “dave help”, “dave drop that”, etc.
- Conversational requests are routed to Gemini AI for natural replies.

### MTG Card Commentary

- `!dave mtg` in chat: Fetches a random Magic: The Gathering card and provides AI-powered spoken analysis.

### Music Queue

- `!dave play <YouTube link>`: Queues a song for playback.
- Priority queue ensures responses and music are played in order.

### Light Controls

- “dave seeing red” and other commands can trigger Yeelight smart light effects.

## 🏗️ Architecture

- **VoiceHandler**: Manages Discord voice connections, recording, and audio playback.
- **GoogleTTSHandler**: Handles TTS requests, cost tracking, and audio file generation.
- **GeminiAIHandler**: Integrates with Gemini AI for game analysis and conversational responses.
- **PriorityQueue**: Manages audio playback order.
- **Modals**: Modular response handlers for music, hype, MTG, help, and more.

## 🐛 Troubleshooting

- **Bot not joining voice channel**: Check `VOICEROOM` and Discord permissions.
- **TTS not working**: Verify Google Cloud credentials and API enablement.
- **Gemini AI not responding**: Check API key and free tier limits.
- **Audio playback issues**: Ensure ffmpeg is installed and accessible.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Discord.js** - For the Discord API wrapper
- **Google Cloud** - For TTS and Gemini AI
- **Wit.ai** - For speech recognition
- **Yeelight** - For smart light integration

---

⭐ **Star this repository if you found it helpful!**
// Discord voice connection, playback, and recording logic
// Handles joining channels, playing audio, recording, and processing speech

import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    EndBehaviorType
} from '@discordjs/voice';
import { createReadStream, createWriteStream } from 'fs';
import prism from 'prism-media';
import { pipeline } from 'stream';
import ffmpegStatic from 'ffmpeg-static';
import { cleanAIResponse, cleanLeadingPunctuation } from '../helpers/aiUtils.js';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import fetch from 'node-fetch';
import { getTagsWithGemini, callVertexAI } from '../ai/geminiAIHandler.js';
import crypto from 'crypto';

ffmpeg.setFfmpegPath(ffmpegStatic);

export class VoiceHandler {
    constructor() {
        this.connections = new Map();
        this.audioPlayers = new Map();
        this._lastTranscription = new Map();
    }

    // Join a voice channel and set up recording
    joinChannel(guild, channelId) {
        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
        });
        this.connections.set(guild.id, connection);
        connection.on(VoiceConnectionStatus.Ready, () => {
            this.setupVoiceRecording(connection, guild);
        });
        connection.on(VoiceConnectionStatus.Disconnected, () => {
            this.connections.delete(guild.id);
        });
        return connection;
    }

    // Play an audio file in the voice channel
    playAudio(guildId, audioPath) {
        const connection = this.connections.get(guildId);
        if (!connection) return;
        const player = createAudioPlayer();
        const resource = createAudioResource(createReadStream(audioPath));
        player.play(resource);
        connection.subscribe(player);
        this.audioPlayers.set(guildId, player);
        return player;
    }

    // Set up voice recording for a connection
    setupVoiceRecording(connection, guild) {
        const receiver = connection.receiver;
        receiver.speaking.on('start', (userId) => {
            const member = guild.members.cache.get(userId);
            if (!member || member.user.bot) return;
            this.createListeningStream(receiver, userId, member.user);
        });
    }

    // Create a stream to listen to a user's audio
    createListeningStream(receiver, userId, user) {
        const opusStream = receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: 500,
            },
        });
        const decoder = new prism.opus.Decoder({
            rate: 48000,
            channels: 2,
            frameSize: 960,
        });
        const outputPath = `./recordings/${userId}-${Date.now()}.pcm`;
        const outputStream = createWriteStream(outputPath);
        pipeline(
            opusStream,
            decoder,
            outputStream,
            (error) => {
                if (!error) {
                    this.processAudioFileCorrectly(outputPath, userId, user);
                }
            }
        );
    }

    // Convert stereo PCM to mono WAV and transcribe
    processAudioFileCorrectly(filePath, userId, user) {
        const wavPath = filePath.replace('.pcm', '.wav');
        ffmpeg()
            .input(filePath)
            .inputFormat('s16le')
            .inputOptions(['-ac 2', '-ar 48000'])
            .audioChannels(1)
            .audioFrequency(48000)
            .audioCodec('pcm_s16le')
            .format('wav')
            .on('end', () => {
                this.transcribeAudio(wavPath, userId, user, (transcription) => {
                    if (transcription && transcription._text) {
                        this.processTranscription(userId, user, transcription._text, filePath, wavPath);
                    }
                });
            })
            .on('error', () => {})
            .save(wavPath);
    }

    // Transcribe audio using Wit.ai
    transcribeAudio(wavPath, userId, user, callback, pcmPath = null) {
        const audioBuffer = fs.readFileSync(wavPath);
        const cleanup = async () => {
            try {
                if (pcmPath) await fs.promises.unlink(pcmPath);
            } catch {}
            try {
                await fs.promises.unlink(wavPath);
            } catch {}
        };

        fetch('https://api.wit.ai/speech?v=20250801', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WITAIKEY}`,
                'Content-Type': 'audio/wav',
                'Transfer-Encoding': 'chunked'
            },
            body: audioBuffer
        })
        .then(response => response.text())
        .then(rawText => {
            let transcription = { _text: '', confidence: 0 };
            let isFinal = false;
            try {
                const data = JSON.parse(rawText);
                transcription._text = data._text || data.text || '';
                transcription.confidence = data.confidence || 0;
                isFinal = !!data.is_final || /"type"\s*:\s*"final/i.test(rawText) || /"is_final"\s*:\s*true/i.test(rawText);
            } catch {
                try {
                    const textMatches = Array.from(rawText.matchAll(/"text"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g));
                    if (textMatches.length) {
                        const last = textMatches[textMatches.length - 1][1];
                        transcription._text = last.replace(/\\n/g, '\n').replace(/\\"/g, '"');
                    } else {
                        const lastLine = rawText.trim().split(/\r?\n/).filter(Boolean).pop() || '';
                        transcription._text = lastLine.replace(/^[^{]*{?/, '').replace(/}[^}]*$/, '').trim().slice(0, 800);
                    }
                    isFinal = /"is_final"\s*:\s*true/i.test(rawText) || /"type"\s*:\s*"final/i.test(rawText);
                    transcription.confidence = transcription._text ? 0.7 : 0;
                } catch {
                    transcription._text = rawText.trim().slice(0, 800);
                    transcription.confidence = 0;
                }
            }

            if (!isFinal) {
                cleanup().catch(() => {});
                return callback(null);
            }

            callback(transcription);
            cleanup().catch(() => {});
        })
        .catch(() => {
            callback(null);
            cleanup().catch(() => {});
        });
    }

    isDaveCommand(normalizedText) {
        return normalizedText.includes('dave');
    }

    isGreeting(normalizedText) {
        return (
            normalizedText.startsWith('hey dave') ||
            normalizedText.startsWith('hello dave') ||
            normalizedText.startsWith('hi dave')
        );
    }

    getGreeting(user, normalizedText) {
        const greetings = [
            `Yo ${user.username}, what's up?`,
            `Hey ${user.username}! How's it going?`,
            `Hi ${user.username}, what can I do for you today?`,
            `Hello ${user.username}! Need anything?`,
            `Hey ${user.username}, I'm here!`
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }

    getSimpleCommandResponse(normalizedText, user) {
        if (normalizedText.includes('play')) {
            const searchTerm = normalizedText.split('dave play')[1];
            return `Playing ${searchTerm} for you now.`;
        } else if (normalizedText.includes('help')) {
            return "I can play music, tell jokes, or control your lights. Just ask!";
        } else if (normalizedText.includes('drop that')) {
            return "Oh yeah, dropping that beat for you!";
        } else if (normalizedText.includes('seeing red')) {
            return "Changing the lights to red mode!";
        } else if (normalizedText.includes('word of the day')) {
            return `Today's word of the day is ${global.wordOfTheDay || 'awesome'}. Use it in a sentence!`;
        } else if (normalizedText.includes('straight up')) {
            return "Straight up, that's what I'm talking about!";
        } else if (normalizedText.includes('thank')) {
            return "You're very welcome! Happy to help.";
        } else if (this.isGreeting(normalizedText)) {
            return this.getGreeting(user, normalizedText);
        } else if (normalizedText.includes('good morning')) {
            return `Good morning, ${user.username}! Ready to rock today?`;
        } else if (normalizedText.includes('hello')) {
            return `Hello ${user.username}! Hope you're having a great day.`;
        } else {
            return `Sure thing! Let me know if you need anything else, ${user.username}.`;
        }
    }

    // Delete audio files after a short delay
    cleanupAudioFiles(pcmPath, wavPath) {
        setTimeout(() => {
            try {
                fs.unlinkSync(pcmPath);
                fs.unlinkSync(wavPath);
            } catch {}
        }, 5000);
    }

    isSimpleCommand(normalizedText) {
        const simpleCommands = [
            'dave play',
            'dave help',
            'dave drop that',
            'dave seeing red',
            'dave word of the day',
            'dave straight up',
            'dave thank',
            'dave good morning',
            'dave hello'
        ];
        for (const cmd of simpleCommands) {
            if (normalizedText.startsWith(cmd)) {
                return true;
            }
        }
        return false;
    }

    // Handle the result of speech transcription
    async processTranscription(userId, user, transcribedText, pcmPath, wavPath) {
        const normalizedText = transcribedText.toLowerCase();
        if (this.isDaveCommand(normalizedText)) {
            if (this.isSimpleCommand(normalizedText)) {
                const responseText = this.getSimpleCommandResponse(normalizedText, user);
                if (responseText) {
                    let cleaned = cleanAIResponse(responseText);
                    cleaned = cleanLeadingPunctuation(cleaned);
                    this.generateSpeechResponse(cleaned, userId, user);
                }
            } else {
                try {
                    const requestId = crypto.randomBytes(6).toString('hex');
                    const last = this._lastTranscription.get(userId);
                    if (last && last.text === transcribedText && (Date.now() - last.ts) < 3000) {
                        this.cleanupAudioFiles(pcmPath, wavPath);
                        return;
                    }
                    this._lastTranscription.set(userId, { text: transcribedText, ts: Date.now() });

                    const tags = await getTagsWithGemini(transcribedText, requestId);
                    const aiResponse = await callVertexAI(transcribedText, tags, userId);
                    console.log('AI Response:', aiResponse);
                    this.generateSpeechResponse(aiResponse, userId, user);
                } catch {
                    this.generateSpeechResponse("Slime, I'm too fried too think of a good response.", userId, user);
                }
            }
        }
        this.cleanupAudioFiles(pcmPath, wavPath);
    }

    // Generate a speech response using TTS
    async generateSpeechResponse(text, userId, user) {
        const { cleanAIResponse, cleanLeadingPunctuation, truncateForTTS } = await import('../helpers/aiUtils.js');
        let cleaned = cleanAIResponse(text);
        let truncated = truncateForTTS(cleaned, 400);
        try {
            if (!global.ttsHandler || typeof global.ttsHandler.generatePersonalizedResponse !== 'function') {
                throw new Error('TTSHandler is not initialized or missing.');
            }
            const audioObj = await global.ttsHandler.generatePersonalizedResponse(truncated, userId);
            if (audioObj && audioObj.path) {
                this.playGeneratedResponse(audioObj.path);
            }
        } catch {}
    }

    // Queue the generated speech audio for playback
    playGeneratedResponse(audioPath) {
        if (global.pQueue && !global.pQueue.isPlaying()) {
            global.pQueue.enqueue({
                'url': audioPath,
                'start': '0s'
            }, 1);
        }
    }

    getConnection(guildId) {
        return this.connections.get(guildId);
    }

    // Disconnect from a voice channel
    disconnect(guildId) {
        const connection = this.connections.get(guildId);
        if (connection) {
            connection.destroy();
            this.connections.delete(guildId);
        }
    }
}

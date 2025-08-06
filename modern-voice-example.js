// Modern Discord.js v14 voice handling class
import {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    getVoiceConnection,
    EndBehaviorType
} from '@discordjs/voice';
import { createReadStream, createWriteStream, unlinkSync } from 'fs';
import prism from 'prism-media';
import { pipeline } from 'stream';
import ffmpegStatic from 'ffmpeg-static';
import { createRequire } from 'module';

// Import CommonJS modules
const require = createRequire(import.meta.url);
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const fetch = require('node-fetch').default || require('node-fetch');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

export class ModernVoiceHandler {
    constructor() {
        this.connections = new Map();
        this.listenStreams = new Map();
        this.audioPlayers = new Map();
    }

    // Modern way to join voice channel
    joinChannel(guild, channelId) {
        const channel = guild.channels.cache.get(channelId);
        
        if (!channel) {
            console.log('Channel not found');
            return;
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: false, // Important: don't self-deafen to receive audio
            selfMute: false,
        });

        // Store connection
        this.connections.set(guild.id, connection);

        // Handle connection events
        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log('Voice connection ready - setting up recording');
            this.setupVoiceRecording(connection, guild);
        });

        connection.on(VoiceConnectionStatus.Disconnected, () => {
            console.log('Voice connection disconnected');
            this.connections.delete(guild.id);
        });

        return connection;
    }

    // Modern audio player
    playAudio(guildId, audioPath) {
        const connection = this.connections.get(guildId);
        if (!connection) {
            console.log('No voice connection found for guild');
            return;
        }

        const player = createAudioPlayer();
        const resource = createAudioResource(createReadStream(audioPath));
        
        player.play(resource);
        connection.subscribe(player);

        player.on(AudioPlayerStatus.Playing, () => {
            console.log('Audio is playing');
        });

        player.on(AudioPlayerStatus.Idle, () => {
            console.log('Audio finished');
        });

        this.audioPlayers.set(guildId, player);
        return player;
    }

    // Modern voice activity detection and recording
    setupVoiceRecording(connection, guild) {
        const receiver = connection.receiver;
        
        // Listen for users starting to speak
        receiver.speaking.on('start', (userId) => {
            console.log(`User ${userId} started speaking`);
            
            // Get user object and check if it's the target user
            const member = guild.members.cache.get(userId);
            // console.log(member);
            // console.log(member.user.username);
            if (member?.user.username === 'priceofquality') {
                this.createListeningStream(receiver, userId, member.user);
            }
        });
        
        receiver.speaking.on('end', (userId) => {
            console.log(`User ${userId} stopped speaking`);
        });
    }

    createListeningStream(receiver, userId, user) {
        // Create an opus stream for the user
        const opusStream = receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: 500, // Stop after 500ms of silence
            },
        });

        // Create a decoder to convert opus to PCM with correct settings
        const decoder = new prism.opus.Decoder({
            rate: 48000,
            channels: 2, // Try stereo again but handle it properly
            frameSize: 960,
        });

        // Create output file stream for PCM
        const outputPath = `./recordings/${userId}-${Date.now()}.pcm`;
        const outputStream = createWriteStream(outputPath);

        // Pipeline: opus -> decoder -> file
        pipeline(
            opusStream,
            decoder,
            outputStream,
            (error) => {
                if (error) {
                    console.error('Pipeline failed:', error);
                } else {
                    console.log(`PCM recording saved: ${outputPath}`);
                    
                    // Process the audio file with correct stereo handling
                    this.processAudioFileCorrectly(outputPath, userId, user);
                }
            }
        );

        // Handle opus data directly (similar to your old onOpus function)
        opusStream.on('data', (chunk) => {
            // console.log(`Received ${chunk.length} bytes of opus data from ${userId}`);
            this.handleOpusData(userId, chunk);
        });
    }

    handleOpusData(userId, data) {
        // This replaces your old onOpus function
        const hexString = data.toString('hex');
        // console.log(`Opus data from ${userId}: ${hexString.substring(0, 20)}...`);
        
        // Your existing logic for handling opus data can go here
    }

    processAudioFileCorrectly(filePath, userId, user) {
        // Convert stereo PCM to mono WAV using ffmpeg 
        console.log(`Processing stereo PCM for user ${userId}: ${filePath}`);
        
        const wavPath = filePath.replace('.pcm', '.wav');
        
        // Use fluent-ffmpeg to convert stereo PCM to mono WAV
        ffmpeg()
            .input(filePath)
            .inputFormat('s16le') // 16-bit signed little-endian PCM
            .inputOptions([
                '-ac 2',  // Input has 2 channels (stereo)
                '-ar 48000' // Input sample rate
            ])
            .audioChannels(1) // Convert to mono output
            .audioFrequency(48000)
            .audioCodec('pcm_s16le')
            .format('wav')
            .on('start', (commandLine) => {
                console.log('FFmpeg stereo->mono conversion started:', commandLine);
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
            })
            .on('end', () => {
                console.log('Stereo PCM to mono WAV conversion completed');
                
                // Now transcribe the audio using Wit.ai
                this.transcribeAudio(wavPath, userId, user, (transcription) => {
                    if (transcription && transcription._text) {
                        console.log('Transcribed text:', transcription._text);
                        
                        // Process the transcription
                        this.processTranscription(userId, user, transcription._text, filePath, wavPath);
                    } else {
                        console.log('No speech detected or transcription failed');
                    }
                });
            })
            .save(wavPath);
    }

    convertOpusToWav(opusPath, userId, user) {
        // Convert opus directly to WAV using ffmpeg
        console.log(`Converting opus to WAV for user ${userId}: ${opusPath}`);
        
        const wavPath = opusPath.replace('.opus', '.wav');
        
        // Use fluent-ffmpeg to convert opus directly to WAV
        ffmpeg()
            .input(opusPath)
            .inputFormat('opus')
            .audioCodec('pcm_s16le')
            .audioChannels(1)
            .audioFrequency(48000)
            .format('wav')
            .on('start', (commandLine) => {
                console.log('FFmpeg opus conversion started:', commandLine);
            })
            .on('error', (err) => {
                console.error('FFmpeg opus conversion error:', err);
            })
            .on('end', () => {
                console.log('Opus to WAV conversion completed');
                
                // Now transcribe the audio using Wit.ai
                this.transcribeAudio(wavPath, userId, user, (transcription) => {
                    if (transcription && transcription._text) {
                        console.log('Transcribed text:', transcription._text);
                        
                        // Process the transcription
                        this.processTranscription(userId, user, transcription._text, opusPath, wavPath);
                    } else {
                        console.log('No speech detected or transcription failed');
                    }
                });
            })
            .save(wavPath);
    }

    processAudioFile(filePath, userId, user) {
        // Convert PCM to WAV using ffmpeg (like your old processRawToWav)
        console.log(`Processing audio file for user ${userId}: ${filePath}`);
        
        const wavPath = filePath.replace('.pcm', '.wav');
        
        // Use fluent-ffmpeg to convert PCM to WAV
        ffmpeg()
            .input(filePath)
            .inputFormat('s16le') // 16-bit signed little-endian PCM
            .audioChannels(1) // Back to mono
            .audioFrequency(48000)
            .audioCodec('pcm_s16le') // Explicitly set codec
            .format('wav')
            .on('start', (commandLine) => {
                console.log('FFmpeg started:', commandLine);
            })
            .on('error', (err) => {
                console.error('FFmpeg error:', err);
            })
            .on('end', () => {
                console.log('PCM to WAV conversion completed');
                
                // Now transcribe the audio using Wit.ai
                this.transcribeAudio(wavPath, userId, user, (transcription) => {
                    if (transcription && transcription._text) {
                        console.log('Transcribed text:', transcription._text);
                        
                        // Process the transcription
                        this.processTranscription(userId, user, transcription._text, filePath, wavPath);
                    } else {
                        console.log('No speech detected or transcription failed');
                    }
                });
            })
            .save(wavPath);
    }

    // Transcribe audio using Wit.ai (recreating your old speech recognition)
    transcribeAudio(wavPath, userId, user, callback) {
        // Read the WAV file
        const audioBuffer = fs.readFileSync(wavPath);
        
        // Send to Wit.ai Speech API
        fetch('https://api.wit.ai/speech?v=20250801', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.WITAIKEY}`,
                'Content-Type': 'audio/wav',
                'Transfer-Encoding': 'chunked'
            },
            body: audioBuffer
        })
        .then(response => {
            // First get the raw text response
            return response.text();
        })
        .then(rawText => {
            console.log('Wit.ai raw response:', rawText);
            
            try {
                // Try to parse as JSON first
                const data = JSON.parse(rawText);
                const transcription = {
                    _text: data._text || data.text || '',
                    confidence: data.confidence || 0
                };
                callback(transcription);
            } catch (jsonError) {
                console.log('Response is not JSON, treating as plain text');
                // If it's not JSON, treat the raw text as the transcription
                const transcription = {
                    _text: rawText.trim(),
                    confidence: 0.5 // Default confidence for plain text responses
                };
                callback(transcription);
            }
        })
        .catch(error => {
            console.error('Wit.ai transcription error:', error);
            callback(null);
        });
    }

    // Process the transcribed text (replaces your handleSpeech call)
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

    cleanupAudioFiles(pcmPath, wavPath) {
        setTimeout(() => {
            try {
                fs.unlinkSync(pcmPath);
                fs.unlinkSync(wavPath);
                console.log('Cleaned up audio files');
            } catch (err) {
                console.error('Error cleaning up files:', err);
            }
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
    processTranscription(userId, user, transcribedText, pcmPath, wavPath) {
        console.log(`User ${user.username} said: "${transcribedText}"`);
        const normalizedText = transcribedText.toLowerCase();
        // Check for 'dave' in the text
        if (this.isDaveCommand(normalizedText)) {
            if (this.isSimpleCommand(normalizedText)) {
                const responseText = this.getSimpleCommandResponse(normalizedText, user);
                if (responseText) {
                    this.generateSpeechResponse(responseText, userId, user);
                }
            } else {
                // Not a simple command, run through Gemini AI for a conversational response
                if (global.aiHandler && typeof global.aiHandler.analyzeGameContent === 'function') {
                    global.aiHandler.analyzeGameContent(transcribedText, 'general', userId)
                        .then(aiResponse => {
                            if (aiResponse) {
                                let cleanResponse = aiResponse.replace(/^hey there[!,. ]*/i, '');
                                this.generateSpeechResponse(cleanResponse, userId, user);
                            } else {
                                this.generateSpeechResponse("Slime, I'm too fried too think of a good response.", userId, user);
                            }
                        })
                        .catch(error => {
                            this.generateSpeechResponse("Slime, I'm too fried too think of a good response.", userId, user);
                        });
                } else {
                    this.generateSpeechResponse("Slime, I'm too fried too think of a good response.", userId, user);
                }
            }
        } else {
            console.log('No Dave command detected in speech.');
        }
        // Clean up files after processing
        this.cleanupAudioFiles(pcmPath, wavPath);
    }

    // Generate speech response using Google Cloud Text-to-Speech
    async generateSpeechResponse(text, userId, user) {
        console.log(`Generating speech response: "${text}"`);
        
        try {
            // Get access token (you'll need to set this up with Google Cloud CLI)
            const { execSync } = require('child_process');
            const accessToken = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
            
            const requestBody = {
                input: {
                    text: text
                },
                voice: {
                    languageCode: 'en-US',
                    name: 'en-US-Standard-D', // STANDARD voice (cheaper: $4/million vs $16/million)
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: 1.0,
                    pitch: 0.0,
                    volumeGainDb: 0.0
                }
            };
            
            const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'x-goog-user-project': process.env.GOOGLE_PROJECT_ID,
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(requestBody)
            });
            
            const data = await response.json();
            
            if (data.audioContent) {
                // Decode base64 audio content
                const audioBuffer = Buffer.from(data.audioContent, 'base64');
                
                // Save to file
                const outputPath = `./sound/response-${userId}-${Date.now()}.mp3`;
                fs.writeFileSync(outputPath, audioBuffer);
                
                console.log(`Speech response saved to: ${outputPath}`);
                
                // Play the generated audio response
                this.playGeneratedResponse(outputPath);
                
            } else {
                console.error('No audio content received from Google TTS:', data);
            }
            
        } catch (error) {
            console.error('Error generating speech response:', error);
        }
    }

    // Play the generated speech response through Discord
    playGeneratedResponse(audioPath) {
        // Add to your priority queue to play through Discord
        if (global.pQueue && !global.pQueue.isPlaying()) {
            global.pQueue.enqueue({
                'url': audioPath,
                'start': '0s'
            }, 1); // High priority for responses
            
            console.log('Queued speech response for playback');
        } else {
            console.log('Audio is currently playing, speech response queued');
        }
    }

    // Get connection for a guild
    getConnection(guildId) {
        return this.connections.get(guildId);
    }

    // Disconnect from voice channel
    disconnect(guildId) {
        const connection = this.connections.get(guildId);
        if (connection) {
            connection.destroy();
            this.connections.delete(guildId);
        }
    }
}

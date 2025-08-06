// Google Cloud Text-to-Speech Handler with Service Account Authentication
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import fs from 'fs';

/**
 * Handles Google Cloud Text-to-Speech operations, usage tracking, and voice personalization.
 */
export class GoogleTTSHandler {
    constructor() {
        this.ttsClient = null;
        this.monthlyCharacterCount = 0;
    }

    /**
     * Initializes the Google Cloud TTS client using environment credentials.
     */
    initializeGoogleTTS() {
        try {
            this.ttsClient = new TextToSpeechClient();
        } catch (error) {
            // Initialization errors should be handled by the caller
        }
    }

    /**
     * Tracks monthly character usage for cost monitoring.
     * @param {string} text - The text synthesized.
     */
    trackTTSUsage(text) {
        this.monthlyCharacterCount += text.length;
        // Warn if approaching free tier limit
        if (this.monthlyCharacterCount > 900000) {
            // Approaching TTS free tier limit
        }
    }

    /**
     * Generates speech audio from text using Google Cloud TTS.
     * @param {string} text - Text to synthesize.
     * @param {string} userId - User identifier for file naming.
     * @param {object} options - Voice and audio configuration.
     * @returns {Promise<string|null>} - Path to saved audio file or null on failure.
     */
    /**
     * Generates speech audio from text using Google Cloud TTS.
     * Returns an object with the file path and an automatic cleanup callback.
     * Usage: const { path, cleanup } = await ttsHandler.generateSpeechResponseEnhanced(...);
     * After playback: await cleanup();
     */
    async generateSpeechResponseEnhanced(text, userId, options = {}) {
        if (!this.ttsClient) {
            this.initializeGoogleTTS();
        }
        this.trackTTSUsage(text);

        try {
            // Default voice settings (STANDARD voice for cost efficiency)
            const defaultOptions = {
                voice: 'en-US-Standard-D',
                languageCode: 'en-US',
                audioEncoding: 'MP3',
                speakingRate: 1.0,
                pitch: 0.0,
                volumeGainDb: 0.0
            };
            const settings = { ...defaultOptions, ...options };

            // Prepare TTS request
            const request = {
                input: { text },
                voice: {
                    languageCode: settings.languageCode,
                    name: settings.voice,
                },
                audioConfig: {
                    audioEncoding: settings.audioEncoding,
                    speakingRate: settings.speakingRate,
                    pitch: settings.pitch,
                    volumeGainDb: settings.volumeGainDb,
                },
            };

            // Synthesize speech
            const [response] = await this.ttsClient.synthesizeSpeech(request);

            if (response.audioContent) {
                const extension = settings.audioEncoding.toLowerCase() === 'mp3' ? 'mp3' : 'wav';
                const outputPath = `./sound/response-${userId}-${Date.now()}.${extension}`;
                fs.writeFileSync(outputPath, response.audioContent, 'binary');
                // Return path and cleanup callback
                return {
                    path: outputPath,
                    cleanup: async () => {
                        try {
                            await fs.promises.unlink(outputPath);
                        } catch (e) {
                            // Ignore if already deleted
                        }
                    }
                };
            }
            return null;
        } catch (error) {
            // Error handling for synthesis failures
            return null;
        }
    }

    /**
     * Returns voice settings for a consistent friendly gamer personality.
     * @param {string} command - Command/context (unused).
     * @param {string} userId - User identifier (unused).
     * @returns {object} - Voice configuration.
     */
    getVoiceForContext(command, userId) {
        return {
            voice: 'en-US-Standard-D',
            languageCode: 'en-US',
            speakingRate: 1.1,
            pitch: 1.0,
            volumeGainDb: 1.0
        };
    }

    /**
     * Generates a personalized speech response using a friendly gamer personality.
     * @param {string} text - Text to synthesize.
     * @param {string} userId - User identifier for file naming.
     * @param {string} context - Context for voice selection.
     * @returns {Promise<string|null>} - Path to saved audio file or null on failure.
     */
    async generatePersonalizedResponse(text, userId, context = 'default') {
        const voiceSettings = this.getVoiceForContext(context, userId);
        return await this.generateSpeechResponseEnhanced(text, userId, voiceSettings);
    }

    /**
     * Returns usage statistics for monitoring and cost estimation.
     * @returns {object} - Usage stats including character count, estimated cost, and remaining free tier.
     */
    getUsageStats() {
        return {
            monthlyCharacterCount: this.monthlyCharacterCount,
            estimatedCost: (this.monthlyCharacterCount / 1000000) * 4.00, // $4 per million chars
            remainingFreeChars: Math.max(0, 1000000 - this.monthlyCharacterCount)
        };
    }
}

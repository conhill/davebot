// Text-to-Speech handler for ElevenLabs
// All logic for generating TTS audio responses

import fetch from 'node-fetch';
import fs from 'fs';
import { cleanLeadingPunctuation } from '../helpers/aiUtils.js';

export class TTSHandler {
	constructor() {
		this.monthlyCharacterCount = 0;
		this.voiceId = process.env.ELEVENLABS_VOICE_ID; // Default voice, override as needed
		this.apiKey = process.env.ELEVENLABS_API_KEY;
	}

	// No-op for fetch version
	initializeElevenLabs() {}

	trackTTSUsage(text) {
		this.monthlyCharacterCount += text.length;
		// Warn if approaching free tier limit
		if (this.monthlyCharacterCount > 900000) {
			// Approaching TTS free tier limit
		}
	}

	/**
	 * Generates speech audio from text using ElevenLabs API.
	 * Returns an object with the file path and an automatic cleanup callback.
	 * Usage: const { path, cleanup } = await ttsHandler.generateSpeechResponseEnhanced(...);
	 * After playback: await cleanup();
	 */
	async generateSpeechResponseEnhanced(text, userId, options = {}) {
		this.trackTTSUsage(text);
		try {
			const voiceId = options.voiceId || this.voiceId;
			const modelId = options.model_id || 'eleven_multilingual_v2';
			const outputFormat = options.output_format || 'mp3_44100_128';
			const apiKey = this.apiKey;
			const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`;
            console.log(text);
            console.log('generateSpeechResponseEnhanced--------');
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'xi-api-key': apiKey,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					text,
					model_id: modelId,
				}),
			});
			if (!response.ok) {
				const errText = await response.text();
				console.error('ElevenLabs TTS error:', errText);
				return null;
			}
			const audioBuffer = await response.buffer();
			const extension = outputFormat.startsWith('mp3') ? 'mp3' : 'wav';
			const outputPath = `./sound/response-${userId}-${Date.now()}.${extension}`;
			fs.writeFileSync(outputPath, audioBuffer);
			return {
				path: outputPath,
				cleanup: async () => {
					try {
						await fs.promises.unlink(outputPath);
					} catch (e) {}
				}
			};
		} catch (error) {
			console.error('Error in ElevenLabs fetch TTS:', error);
			return null;
		}
	}

	getVoiceForContext(command, userId) {
		// You can customize this to select different voices or models per context
		return {
			voiceId: this.voiceId || '9pYTZDXU5imB4rqJDulE',
			model_id: 'eleven_multilingual_v2',
			output_format: 'mp3_44100_128',
		};
	}

	async generatePersonalizedResponse(text, userId, context = 'default') {
		const voiceSettings = this.getVoiceForContext(context, userId);
		return await this.generateSpeechResponseEnhanced(text, userId, voiceSettings);
	}

	getUsageStats() {
		// ElevenLabs pricing may differ, so this is just a placeholder
		return {
			monthlyCharacterCount: this.monthlyCharacterCount,
			estimatedCost: (this.monthlyCharacterCount / 1000000) * 4.00, // Adjust as needed
			remainingFreeChars: Math.max(0, 1000000 - this.monthlyCharacterCount)
		};
	}
}

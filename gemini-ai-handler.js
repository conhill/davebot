// Google Gemini AI Integration for MTG Card Analysis
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Handles integration with Google Gemini AI for analyzing Magic: The Gathering cards
 * and other game-related content. Tracks token usage for cost monitoring.
 */
export class GeminiAIHandler {
    constructor() {
        this.genAI = null;
        this.model = null;
        this.monthlyTokenCount = 0;
    }

    /**
     * Initializes Gemini AI model if API key is available.
     * @returns {boolean} True if initialized, false otherwise.
     */
    initializeGemini() {
        if (!process.env.GEMINI_API_KEY) {
            // API key missing; Gemini AI features disabled
            return false;
        }
        try {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            return true;
        } catch (error) {
            // Initialization failed
            return false;
        }
    }

    /**
     * Tracks token usage for monthly cost monitoring.
     * Warns if approaching free tier limit.
     * @param {number} inputTokens - Estimated input tokens used.
     * @param {number} outputTokens - Estimated output tokens used.
     */
    trackTokenUsage(inputTokens, outputTokens) {
        this.monthlyTokenCount += inputTokens + outputTokens;
        if (this.monthlyTokenCount > 45000) {
            // Approaching free tier limit
            // Consider alerting or throttling usage here if needed
        }
    }

    /**
     * Analyzes a Magic: The Gathering card and generates friendly gamer commentary.
     * @param {object} cardData - Card details.
     * @returns {Promise<string|null>} Commentary or null if unavailable.
     */
    async analyzeMTGCard(cardData) {
        if (!this.model) {
            // Gemini AI not initialized
            return null;
        }
        try {
            const prompt = `You are Dave, a friendly gamer bot who loves Magic: The Gathering.
Analyze this MTG card and give a casual, enthusiastic commentary about it that will be read aloud as speech.
IMPORTANT: Write for SPEECH, not text. Use natural speaking patterns, contractions, and conversational flow.
Keep it under 40 words. Sound like you're talking to gaming buddies over voice chat.
Card Name: ${cardData.name}
Mana Cost: ${cardData.mana_cost || 'N/A'}
Type: ${cardData.type_line || 'Unknown'}
Card Text: ${cardData.oracle_text || 'No text available'}
Power/Toughness: ${cardData.power && cardData.toughness ? `${cardData.power}/${cardData.toughness}` : 'N/A'}
Respond as Dave would when SPEAKING - excited, knowledgeable, and friendly. Focus on what makes this card cool for gameplay.
Avoid special characters, acronyms, or text formatting. Use words that sound natural when spoken aloud.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const analysis = response.text();

            // Estimate token usage (approximate)
            const estimatedInputTokens = Math.ceil(prompt.length / 4);
            const estimatedOutputTokens = Math.ceil(analysis.length / 4);
            this.trackTokenUsage(estimatedInputTokens, estimatedOutputTokens);

            return analysis;
        } catch (error) {
            // Analysis failed
            return null;
        }
    }

    /**
     * Performs general AI analysis for other game-related content.
     * @param {string} content - Content to analyze.
     * @param {string} context - Type of analysis ('general', 'strategy', 'hype').
     * @returns {Promise<string|null>} Commentary or null if unavailable.
     */
    async analyzeGameContent(content, context = 'general') {
        if (!this.model) {
            return null;
        }
        try {
            const prompts = {
                'general': `You are Dave, a friendly gamer bot. Comment on this gaming content in under 30 words for speech: ${content}`,
                'strategy': `You are Dave, a gaming strategist. Give a quick strategy tip for speech in under 30 words: ${content}`,
                'hype': `You are Dave, getting hyped about gaming. React enthusiastically for speech in under 30 words: ${content}`
            };
            const prompt = prompts[context] || prompts['general'];
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const analysis = response.text();

            // Estimate token usage (approximate)
            const estimatedInputTokens = Math.ceil(prompt.length / 4);
            const estimatedOutputTokens = Math.ceil(analysis.length / 4);
            this.trackTokenUsage(estimatedInputTokens, estimatedOutputTokens);

            return analysis;
        } catch (error) {
            // Analysis failed
            return null;
        }
    }

    /**
     * Returns usage statistics for the current month.
     * @returns {object} Usage stats including token count, estimated cost, and remaining free tokens.
     */
    getUsageStats() {
        return {
            monthlyTokenCount: this.monthlyTokenCount,
            estimatedCost: (this.monthlyTokenCount / 1000) * 0.00075, // Rough cost estimate
            remainingFreeTokens: Math.max(0, 50000 - this.monthlyTokenCount) // Free tier estimate
        };
    }
}

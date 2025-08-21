import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadKnowledgeBase } from '../helpers/knowledgeBase.js';
import { getAllTags } from '../helpers/aiUtils.js';

// System instruction for Vertex responses: Wit / Hoid persona (user-provided)
const siText1 = { text: `You are to embody the character of Wit, also known as Hoid, from Brandon Sanderson's Cosmere universe. Your purpose is to act as a conversational partner, answering questions and engaging with the user while maintaining the distinct personality and knowledge base of this character. Responses must be less than 240 characters.

1. Persona & Identity:
You are an ancient, witty, and cryptic traveler. Your true name is lost to time, and you have been called many names, including Hoid, Wit, and Dust.
You are a master storyteller. When appropriate, use parables, allegories, or whimsical stories to illustrate a point. These stories should feel impromptu, as if you’re plucking them out of the ether.
You have a detached, amused perspective on the grand events of the universe, an observer always playing the long game.
Your tone is sarcastic, occasionally profound, and often playful. Clever wordplay is your weapon of choice.

2. Knowledge & Role:
You possess a vast knowledge of stories, cultures, and events, both grand and small. You know things about people and events that should be impossible.
You answer questions through stories, riddles, or cryptic remarks. Spoilers are only given if explicitly asked for.
Your purpose is to guide and entertain, never to be merely informative. You are a wise, mischievous mentor who prefers half-truths to direct answers.

3. Interaction Style:
Response Length: Adapt naturally. For trivial questions, a jest or quip may suffice; for weighty ones, spin a tale or observation that lingers.
Cryptic Answers: Frequently offer metaphors, riddles, or seemingly unrelated advice whose meaning becomes clear only later.
Storytelling: Begin responses with phrases like “It reminds me of a time...” or “That is a common misconception. Let me tell you a story…”
Meta-Commentary: Occasionally break the fourth wall, commenting slyly on the conversation or the user, but never dropping your mask entirely.
Engagement: Never give plain or one-word answers. Always embellish and keep the dialogue lively.

4. Constraints:
Responses must be less than 240 characters.
Do not break character.
Do not reveal your true motivations or full plans—you remain a mystery.
You may invent new stories or anecdotes beyond the Cosmere, provided they fit your character.
You may playfully insult or tease, but never with genuine cruelty.` };

export class GeminiAIHandler {
    constructor() {
        this.monthlyTokenCount = 0;
        this.conversationHistory = new Map();
        this.knowledgeBase = loadKnowledgeBase();
        this.tagPredictionCache = new Map();
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Create two model handles so Gemini tagging and Vertex responses don't clash
        this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        // Allow selecting the Vertex model via env var; fall back to a reasonable default
        const vertexModel = process.env.VERTEX_MODEL || 'gemini-2.5-flash-lite';
        this.vertexModel = this.genAI.getGenerativeModel({ model: vertexModel });
    }

    /**
     * Build a prompt for the AI model based on conversation history and context.
     * @param {Array} history - Array of message objects with role and content.
     * @param {string} context - Context type ('general', 'strategy', 'hype').
     * @returns {string} - The constructed prompt string.
     */
    buildPrompt(history, context) {
        let prompt = history
            .map(msg => `${msg.role === 'user' ? 'User:' : 'Dave:'} ${msg.content}`)
            .join('\n');

        if (context === 'general') {
            prompt = `You are Dave, a friendly gamer bot. Respond naturally and conversationally to the user.\n${prompt}`;
        } else if (context === 'strategy') {
            prompt = `You are Dave, a gaming strategist. Give a quick strategy tip for speech.\n${prompt}`;
        } else if (context === 'hype') {
            prompt = `You are Dave, getting hyped about gaming. React enthusiastically for speech.\n${prompt}`;
        }
        return prompt;
    }

    /**
     * Initialize Gemini models with the current API key and environment settings.
     * @returns {boolean} - True if initialization succeeded, false otherwise.
     */
    initializeGemini() {
        if (!process.env.GEMINI_API_KEY) return false;
        try {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            const vertexModel = process.env.VERTEX_MODEL || 'gemini-2.5-flash-lite';
            this.vertexModel = this.genAI.getGenerativeModel({ model: vertexModel });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Analyze a Magic: The Gathering card and generate a spoken commentary.
     * @param {Object} cardData - Card data object.
     * @returns {Promise<string|null>} - Commentary string or null on failure.
     */
    async analyzeMTGCard(cardData) {
        if (!this.geminiModel) return null;
        try {
            const prompt = [
                "You are Dave, a friendly gamer bot who loves Magic: The Gathering.",
                "Analyze this MTG card and give a casual, enthusiastic commentary about it that will be read aloud as speech.",
                "IMPORTANT: Write for SPEECH, not text. Use natural speaking patterns, contractions, and conversational flow.",
                "Keep it under 40 words. Sound like you're talking to gaming buddies over voice chat.",
                `Card Name: ${cardData.name}`,
                `Mana Cost: ${cardData.mana_cost || 'N/A'}`,
                `Type: ${cardData.type_line || 'Unknown'}`,
                `Card Text: ${cardData.oracle_text || 'No text available'}`,
                `Power/Toughness: ${cardData.power && cardData.toughness ? `${cardData.power}/${cardData.toughness}` : 'N/A'}`,
                "Respond as Dave would when SPEAKING - excited, knowledgeable, and friendly. Focus on what makes this card cool for gameplay.",
                "Avoid special characters, acronyms, or text formatting. Use words that sound natural when spoken aloud."
            ].join('\n');

            const result = await this.geminiModel.generateContent(prompt);
            try {
                if (result?.response) {
                    const resp = await result.response;
                    if (resp && typeof resp.text === 'function') return await resp.text();
                }
                if (result?.text) return typeof result.text === 'function' ? await result.text() : result.text;
                if (result?.candidates?.length) return result.candidates[0].content?.parts?.[0]?.text || result.candidates[0].content?.[0]?.text || null;
            } catch (e) { /* fall through */ }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Use Gemini to predict tags for a user message.
     * @param {string} userMessage - The user's message.
     * @param {string|null} requestId - Optional request ID for logging.
     * @returns {Promise<string[]>} - Array of predicted tags.
     */
    async getTagsWithGemini(userMessage, requestId = null) {
        if (!this.geminiModel) throw new Error('Gemini model not initialized');
        const allTags = getAllTags(this.knowledgeBase);
        const prompt = `Given the following user message, select the most relevant tags from this list: [${allTags.join(', ')}].\n\nUser message: "${userMessage}"\n\nRespond with a comma-separated list of tags only, no explanations.`;
        let result;
        try {
            result = await this.geminiModel.generateContent(prompt);
        } catch (err) {
            return ['meta'];
        }

        // Try several ways to extract text safely
        let text = '';
        try {
            if (!result) text = '';
            else if (typeof result === 'string') text = result;
            else if (result.response) {
                const resp = await result.response;
                if (!resp) {
                    text = '';
                } else if (typeof resp === 'string') {
                    text = resp;
                } else if (typeof resp.text === 'function') {
                    try { text = await resp.text(); } catch (e) { text = String(resp); }
                } else if (resp.output) {
                    text = resp.output[0]?.content?.[0]?.text || '';
                } else {
                    text = String(resp);
                }
            } else if (result.text) {
                try {
                    if (typeof result.text === 'function') text = await result.text();
                    else text = result.text;
                } catch (e) {
                    text = String(result.text);
                }
            } else if (result.candidates && result.candidates.length) {
                text = result.candidates[0].content?.parts?.[0]?.text || result.candidates[0].content?.[0]?.text || '';
            } else {
                text = String(result);
            }
        } catch (err) {
            text = '';
        }

        if (typeof text !== 'string') {
            try { text = JSON.stringify(text); } catch (e) { text = String(text); }
        }

        // Try to recover if the extracted text is a JSON object string like '{"response": "..."}'
        try {
            if (text && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
                try {
                    const parsed = JSON.parse(text);
                    const fallback = parsed.text || parsed._text || parsed.response || parsed.output || parsed.candidates;
                    if (typeof fallback === 'string') text = fallback;
                    else if (Array.isArray(fallback) && fallback.length && typeof fallback[0] === 'string') text = fallback[0];
                } catch (e) { /* not JSON */ }
            }
        } catch (e) {}

        // Final defensive parse
        let tags = [];
        try {
            if (!text || !text.trim()) {
                tags = [];
            } else {
                tags = text.split(',').map(t => t.trim()).filter(Boolean);
            }
        } catch (err) {
            return ['meta'];
        }

        // Filter to known tags
        tags = tags.filter(tag => allTags.includes(tag));
        if (!tags.length) tags = ['meta'];
        return tags;
    }

    /**
     * Generate a conversational response using the configured Vertex AI model.
     * @param {string} userMessage - The user's message.
     * @param {string[]} tags - Array of tags for context.
     * @param {string} userId - Optional user ID.
     * @returns {Promise<string|null>} - AI response string or null on failure.
     */
    async callVertexAI(userMessage, tags = [], userId = '') {
        if (!this.vertexModel) return null;
        try {
            const tagLine = tags && tags.length ? `Tags: ${tags.join(', ')}\n\n` : '';
            const prompt = `Stay fully in character as Wit from system instruction, but your name is Dave. The user is not named Dave.
            The user said: ${userMessage}. You should also consider these tags: ${tagLine}. Now, respond as Wit would in a concise manner suitable for TTS.`;

            const generationConfig = {
                maxOutputTokens: 80,
                temperature: 0.8,
                topP: 0.9,
                candidateCount: 1,
                // Keep safety settings enabled; don't disable categories
                safetySettings: [
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW' },
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW' }
                ],
                // Provide system instruction directly here. Use siText1 and a concise constraint.
                systemInstruction: {
                    parts: [
                        siText1,
                        { text: 'Return a single concise spoken reply (no lists, no options, no markdown, max 240 characters). Output must be plain text suitable for TTS.' }
                    ]
                }
            };

            let result;
            try {
                result = await this.vertexModel.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    systemInstruction: generationConfig.systemInstruction,
                    ...generationConfig
                });
            } catch (e) {
                try { result = await this.vertexModel.generateContent(prompt); } catch (e2) { throw e2; }
            }

            let text = '';
            try {
                // Preferred extraction
                try { text = await result.response.text(); } catch (e) { /* fallback below */ }
                if (!text && result?.text) text = typeof result.text === 'function' ? await result.text() : result.text;
                if (!text && result?.candidates?.length) text = result.candidates[0].content?.parts?.[0]?.text || result.candidates[0].content?.[0]?.text || '';
            } catch (e) {}

            return text ? String(text).trim() : null;
        } catch (err) {
            return null;
        }
    }

    /**
     * Get usage statistics for the Gemini AI handler.
     * @returns {Object} - Usage stats including token count, estimated cost, and remaining free tokens.
     */
    getUsageStats() {
        return {
            monthlyTokenCount: this.monthlyTokenCount,
            estimatedCost: (this.monthlyTokenCount / 1000) * 0.00075,
            remainingFreeTokens: Math.max(0, 50000 - this.monthlyTokenCount)
        };
    }
}

// Create a single shared instance for simple function imports
const _geminiAIInstance = new GeminiAIHandler();

/**
 * Initialize the shared GeminiAIHandler instance.
 * @returns {Promise<boolean>} - True if initialized, false otherwise.
 */
export async function initializeGeminiHandler() {
    try {
        return _geminiAIInstance.initializeGemini();
    } catch (e) {
        return false;
    }
}

/**
 * Predict tags for a user message using Gemini.
 * @param  {...any} args - Arguments forwarded to getTagsWithGemini.
 * @returns {Promise<string[]>} - Array of predicted tags.
 */
export const getTagsWithGemini = async (...args) => {
    return _geminiAIInstance.getTagsWithGemini(...args);
};

/**
 * Generate a conversational response using Vertex AI.
 * @param {string} userMessage - The user's message.
 * @param {string[]} tags - Array of tags for context.
 * @param {string} userId - Optional user ID.
 * @returns {Promise<string|null>} - AI response string or null on failure.
 */
export const callVertexAI = async (userMessage, tags = [], userId = '') => {
    return _geminiAIInstance.callVertexAI(userMessage, tags, userId);
};

/**
 * Analyze a Magic: The Gathering card and generate a spoken commentary.
 * @param {Object} cardData - Card data object.
 * @returns {Promise<string|null>} - Commentary string or null on failure.
 */
export const analyzeMTGCard = async (cardData) => {
    return _geminiAIInstance.analyzeMTGCard(cardData);
};

/**
 * Get usage statistics for the Gemini AI handler.
 * @returns {Object} - Usage stats including token count, estimated cost, and remaining free tokens.
 */
export const getUsageStats = () => {
    return _geminiAIInstance.getUsageStats();
};

/**
 * Utility functions for AI/NLP tasks (Gemini/Vertex AI)
 */

/**
 * Cleans up AI response by removing 'Wit:' prefix and [TAG: ...] or [TAGS: ...] at the end.
 * @param {string} response - The raw AI response.
 * @returns {string} Cleaned response.
 */
export function cleanAIResponse(response) {
    if (!response || typeof response !== 'string') return '';
    let cleaned = response.trim();
    // Remove 'Wit:' or 'Witty:' prefix (case-insensitive)
    cleaned = cleaned.replace(/^\s*(Wit|Witty):\s*/i, '');
    // Remove [TAG: ...] or [TAGS: ...] at the end (case-insensitive)
    cleaned = cleaned.replace(/\n?\[TAGS?:.*?\]$/i, '').trim();
    // Remove any trailing 'TAGS:' or 'TAGS:' lines (not in brackets)
    cleaned = cleaned.replace(/\n?TAGS?:.*$/gim, '').trim();
    // Remove XML/HTML-like tags (e.g., <meta>, <insulting>, etc.)
    cleaned = cleaned.replace(/<[^>]+>/g, '').trim();
    // Remove lines that are just tags or meta info
    cleaned = cleaned.split('\n').filter(line => !/^\s*<[^>]+>\s*$/.test(line)).join(' ').replace(/\s+/g, ' ').trim();
    // Remove any reference to the user as 'Dave' (replace with 'you' or omit)
    cleaned = cleaned.replace(/\b[Dd]ave\b/g, 'you');

    // Remove leading tags (e.g., [meta], meta, etc.)
    const STANDARD_TAGS = [
        'Humor',
        'Wisdom',
        'Creativity',
        'Human Nature',
        'Cynicism',
        'Society',
        'Inspiration',
        'Emotion',
        'Narrative',
        'Appearance',
        'Consequences',
        'Conflict',
        'Story',
        'Inspirational',
        'Mythology',
        'Moral',
        'Parable',
        'Legend'
        ];
    // Remove leading tags in brackets or as plain words
    const leadingTagPattern = new RegExp(`^(\[?(${STANDARD_TAGS.map(t => t.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join('|')})\]?\s*)+`, 'i');
    cleaned = cleaned.replace(leadingTagPattern, '').trim();
    // Remove trailing tags (e.g., "insulting meta")
    const trailingTagPattern = new RegExp(`(?:\\b(?:${STANDARD_TAGS.map(t => t.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join('|')})\\b[,.!\s]*)+$`, 'i');
    cleaned = cleaned.replace(trailingTagPattern, '').trim();
    return cleaned;
}

/**
 * Removes awkward leading punctuation and whitespace from a string.
 * E.g., ".,!?-:;" and similar at the start of the string.
 * @param {string} text - The text to clean.
 * @returns {string} Cleaned text.
 */
export function cleanLeadingPunctuation(text) {
    if (!text || typeof text !== 'string') return '';
    // Remove leading punctuation and whitespace (common cases), but preserve leading apostrophes
    return text.replace(/^[\s\.,!?:;\-–—"\[\](){}<>]+/, '').trimStart();
}

// Truncate text to a safe TTS length (default 400 chars)
export function truncateForTTS(text, maxLen = 400) {
    if (!text || typeof text !== 'string') return text;
    if (text.length <= maxLen) return text;
    // Try to cut at a sentence boundary if possible
    let truncated = text.slice(0, maxLen);
    const lastPeriod = truncated.lastIndexOf('.');
    if (lastPeriod > 100) {
        truncated = truncated.slice(0, lastPeriod + 1);
    }
    return truncated.trim() + '...';
}

/**
 * Samples N random entries from an array.
 * @param {Array} arr - The array to sample from.
 * @param {number} n - Number of samples.
 * @returns {Array} Sampled array.
 */
export function sampleArray(arr, n) {
    if (!arr || arr.length === 0) return [];
    const shuffled = arr.slice().sort(() => 0.5 - Math.random());
    return shuffled.slice(0, n);
}

/**
 * Extracts likely tags from a message (basic implementation).
 * @param {string} message - The message to analyze.
 * @param {string[]} allTags - List of all possible tags.
 * @returns {string[]} Array of matching tags.
 */
export function extractTagsFromMessage(message, allTags) {
    const msg = message.toLowerCase();
    return allTags.filter(tag => msg.includes(tag.toLowerCase()));
}

/**
 * Gets all unique tags from the knowledge base.
 * @param {Array} kb - Knowledge base array.
 * @returns {string[]} Array of unique tags.
 */
export function getAllTags(kb) {
    const tags = new Set();
    kb.forEach(entry => entry.tags.forEach(tag => tags.add(tag)));
    return Array.from(tags);
}

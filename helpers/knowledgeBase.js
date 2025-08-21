// helpers/knowledgeBase.js
// Loads and parses TXT files from knowledge_base/ for RAG context
import fs from 'fs';
import path from 'path';

const KB_DIR = path.resolve('./knowledge_base');


// Standardize and align tags to a core set
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

function normalizeTag(tag) {
    if (!tag) return '';
    // Lowercase, trim, and align to standard tags if possible
    const t = tag.trim().toLowerCase();
    // Try to match to a standard tag (case-insensitive)
    const std = STANDARD_TAGS.find(st => st.toLowerCase() === t);
    return std || t;
}

function normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];
    const norm = tags.map(normalizeTag).filter(Boolean);
    // Deduplicate
    return Array.from(new Set(norm));
}

// Parse a single TXT file into an array of { text, tags, type }
function parseQuotesFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const entries = content.split(/\n\n+/).map(block => {
        const tagMatch = block.match(/TAG:\s*(.*)/i);
        const tags = tagMatch ? tagMatch[1].split(',').map(t => t.trim()) : [];
        const text = block.replace(/TAG:.*/i, '').trim();
        return text ? { text, tags: normalizeTags(tags), type: 'quote' } : null;
    }).filter(Boolean);
    return entries;
}

// Parse a single JSON file (array of objects with text/tags)
function parseJsonFile(filePath, typeHint = null) {
    const content = fs.readFileSync(filePath, 'utf-8');
    let arr;
    try {
        arr = JSON.parse(content);
    } catch (e) {
        console.error('[knowledgeBase] Failed to parse JSON:', filePath, e);
        return [];
    }
    if (!Array.isArray(arr)) return [];
    return arr.map(entry => {
        if (!entry.text) return null;
        // Try to infer type from file or use typeHint
        let type = typeHint;
        if (!type && filePath.toLowerCase().includes('story')) type = 'story';
        if (!type && filePath.toLowerCase().includes('quote')) type = 'quote';
        return {
            text: entry.text,
            tags: normalizeTags(entry.tags || []),
            type: type || 'quote',
        };
    }).filter(Boolean);
}


// Load all .txt and .json files in the knowledge base directory
export function loadKnowledgeBase() {
    const files = fs.readdirSync(KB_DIR).filter(f => f.endsWith('.txt') || f.endsWith('.json'));
    let allEntries = [];
    for (const file of files) {
        const filePath = path.join(KB_DIR, file);
        if (file.endsWith('.txt')) {
            allEntries = allEntries.concat(parseQuotesFile(filePath));
        } else if (file.endsWith('.json')) {
            // Use type hint based on filename
            let typeHint = null;
            if (file.toLowerCase().includes('story')) typeHint = 'story';
            if (file.toLowerCase().includes('quote')) typeHint = 'quote';
            allEntries = allEntries.concat(parseJsonFile(filePath, typeHint));
        }
    }
    return allEntries;
}

// Retrieve relevant quotes by keyword or tag
export function searchKnowledgeBase(query, quotes) {
    const q = query.toLowerCase();
    return quotes.filter(qt =>
        qt.text.toLowerCase().includes(q) ||
        qt.tags.some(tag => tag.toLowerCase().includes(q))
    );
}

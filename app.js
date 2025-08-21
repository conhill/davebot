// --- End migrated command handler ---

import express from 'express';
import bodyParser from 'body-parser';
import { Client, GatewayIntentBits } from 'discord.js';
import { VoiceHandler } from './voice/voiceHandler.js';
import { TTSHandler } from './voice/ttsHandler.js';
import { initializeGeminiHandler } from './ai/geminiAIHandler.js';
import PriorityQueue from './modals/musicQueue/music_queue.js';
import { getCommandType, handleCommand } from './helpers/commands.js';
import 'dotenv/config';
import { YOUTUBE_SONGS, RAGE_SONG, INITIAL_SOUND } from './helpers/constants.js';
const app = express();

// Initialize handlers
const voiceHandler = new VoiceHandler();
const ttsHandler = new TTSHandler();

// Initialize services
ttsHandler.initializeElevenLabs();
initializeGeminiHandler();
// Expose a minimal global.aiHandler for backward compatibility
import * as GeminiExports from './ai/geminiAIHandler.js';
global.aiHandler = {
	analyzeMTGCard: GeminiExports.analyzeMTGCard,
	getUsageStats: GeminiExports.getUsageStats,
};

const bot = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates, // Required for voice connections
	],
});

// Global Variables
global.connection;
global.channel;
global.userTalking = false;
global.pQueue = new PriorityQueue();
global.streaming = false;
global.reLoggedOnce = false;
global.voiceHandler = voiceHandler;
global.ttsHandler = ttsHandler;
// global.aiHandler is no longer needed for VoiceHandler



// Helper: Route message commands
function handleMessage(message) {
	if (message.author.bot) return;
	const commandType = getCommandType(message);
	// Await the async handleCommand for commands like mtg
	handleCommand(commandType, message);
}

// Helper: Route message commands (no-op)

// Bot ready event handler
const fireReady = () => {
	console.log('Bot is online.');
	console.log('Running on port 3000.');
};

app.use(bodyParser.json());

// Join voice channel using modern Discord.js syntax
const JoinChannel = (id) => {
	const guild = bot.guilds.cache.values().next().value;
	const channel = bot.channels.cache.get(id);

	if (!channel) {
		console.error(`Voice channel ${id} not found.`);
		return;
	}
	// Start Voice Connection
	// Handles audio playback and voice state management
	const connection = voiceHandler.joinChannel(guild, id);

	if (connection) {
		global.connection = connection;
		console.log('Joined voice channel:', channel.name);
		console.log('Voice connection established.');

		// Play initial sound after connection is ready
		connection.on('stateChange', (oldState, newState) => {
			if (newState.status === 'ready' && oldState.status !== 'ready') {
				setTimeout(() => {
					global.pQueue.enqueue({
						url: INITIAL_SOUND,
						start: '0s'
					}, 1);
				}, 1000);
			}
		});
	}
};

// Message handler
bot.on('messageCreate', handleMessage);

// Voice state update handler
// Users joining or leaving voice channels
// bot.on('voiceStateUpdate', handleVoiceStateUpdate);

// Voice state update handler removed (was unused/commented)

// Bot event handlers
bot.on('error', console.error);

bot.on('ready', () => {
	fireReady();
	JoinChannel(process.env.VOICEROOM);
});

bot.on('disconnect', (erMsg, code) => {
	console.log('Bot disconnected from Discord with code', code, 'Reason:', erMsg);
	JoinChannel(process.env.VOICEROOM);
});

bot.login(process.env.ROOMKEY);

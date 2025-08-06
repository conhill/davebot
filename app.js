'use strict';

import express from 'express';
import bodyParser from 'body-parser';
import { Client, GatewayIntentBits } from 'discord.js';
import { ModernVoiceHandler } from './modern-voice-example.js';
import { GoogleTTSHandler } from './google-tts-enhanced.js';
import { GeminiAIHandler } from './gemini-ai-handler.js';
import PriorityQueue from './modals/musicQueue/music_queue.js';
import { genericResponse } from './modals/genericResponse/generic_response.js';
import { hypeResponse } from './modals/hypeResponse/hype_response.js';
import { mtgResponse } from './modals/mtgResponse/mtg_response.js';
import { helpResponse } from './modals/helpResponse/help_response.js';
import 'dotenv/config';

const app = express();

// Initialize handlers
const voiceHandler = new ModernVoiceHandler();
const ttsHandler = new GoogleTTSHandler();
const aiHandler = new GeminiAIHandler();

// Initialize services
ttsHandler.initializeGoogleTTS();
aiHandler.initializeGemini();

const bot = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildVoiceStates, // Required for voice connections
	],
});

const fetch = (await import('node-fetch')).default;

// Global Variables
global.connection;
global.channel;
global.userTalking = false;
global.pQueue = new PriorityQueue();
global.streaming = false;
global.reLoggedOnce = false;
global.voiceHandler = voiceHandler;
global.ttsHandler = ttsHandler;
global.aiHandler = aiHandler;

// Constants
const YOUTUBE_SONGS = {
	NuclearLink: 'https://www.youtube.com/watch?v=6FFH3lOP_9M',
	'Price of Quality': 'https://www.youtube.com/watch?v=eqwiC93zmxI',
	tagowar: 'https://www.youtube.com/watch?v=ITQB_n9bqCc',
	bbp: 'https://www.youtube.com/watch?v=U9FzgsF2T-s',
	KingKoopa: 'https://www.youtube.com/watch?v=SzTX5E1t8og',
};
const RAGE_SONG = 'https://www.youtube.com/watch?v=2LXRKTjpDm8';
const INITIAL_SOUND = './sound/icecubes.mp3';

// Helper: Enqueue TTS response
function enqueueTTSResponse(text, userId, priority = 1) {
	return ttsHandler.generatePersonalizedResponse(text, userId)
		.then(audioPath => {
			if (audioPath && global.pQueue) {
				global.pQueue.enqueue({ url: audioPath, start: '0s' }, priority);
			}
		})
		.catch(error => {
			console.error('TTS Error:', error);
		});
}

// Helper: Format TTS stats message
function formatTTSStats(stats) {
	return `TTS Usage Stats:\nCharacters used: ${stats.monthlyCharacterCount}\nEstimated cost: $${stats.estimatedCost.toFixed(2)}\nFree tier remaining: ${stats.remainingFreeChars} chars`;
}

// Helper: Handle voice state changes
function handleVoiceStateUpdate(oldState, newState) {
	const member = newState.member;
	if (!oldState.channel && newState.channel) {
		// User joined
		console.log('Enqueuing song for:', member.displayName);
		const song = YOUTUBE_SONGS[member.displayName];
		const startTimes = {
			NuclearLink: '15s',
			'Price of Quality': '5s',
			tagowar: '17s',
			bbp: '17s',
			KingKoopa: '0s',
		};
		const length = 30;
		if (song) {
			global.pQueue.enqueue({
				url: song,
				start: startTimes[member.displayName] || '0s',
				length: length
			}, 2);
		} else {
			console.warn(`${member.displayName} joined. No song assigned.`);
		}
	} else if (oldState.channel && !newState.channel) {
		// User left
		global.pQueue.enqueue({ url: RAGE_SONG, start: '0s' }, 2);
	}
}

// Helper: Route message commands
function handleMessage(message) {
	if (message.author.bot) return;
	const msg = message.content.toLowerCase();
	if (msg === '!dave') {
		genericResponse(message);
		return;
	}
	if (msg.includes('!dave play') && !msg.includes('youtu.be')) {
		const song = message.content.split(' ')[2];
		global.pQueue.enqueue({ url: song, start: '0s', length: 30 }, 2);
		message.delete().catch(console.error);
		return;
	}
	if (msg.includes('!dave play') && msg.includes('youtu.be')) {
		message.channel.send('Incorrect YouTube link format. Use youtube.com/watch?v= links.');
		return;
	}
	if (msg === '!dave mtg') {
		mtgResponse(message);
		return;
	}
	if (msg === '!dave help') {
		helpResponse(message);
		return;
	}
	if (msg === '!dave hype' && message.author.username === 'Dnoop') {
		message.channel.send('@everyone');
		enqueueTTSResponse("Oh snap! Time to get hyped! Let's game on, team!", message.author.id);
		return;
	}
	if (msg === '!dave gaming') {
		enqueueTTSResponse("Hey gamers! What are we playing today? I'm always down for a good session!", message.author.id);
		return;
	}
	if (msg === '!dave gg') {
		const ggResponses = [
			"GG everyone! That was an epic match!",
			"Good game! You all played awesome!",
			"GG! Ready for another round?",
			"Nice game! That was some solid gameplay!"
		];
		const randomResponse = ggResponses[Math.floor(Math.random() * ggResponses.length)];
		enqueueTTSResponse(randomResponse, message.author.id);
		return;
	}
	if (msg === '!dave stats' && message.author.username === 'Dnoop') {
		const stats = ttsHandler.getUsageStats();
		message.channel.send(formatTTSStats(stats));
		return;
	}
}

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
bot.on('voiceStateUpdate', handleVoiceStateUpdate);

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

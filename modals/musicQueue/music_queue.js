// Helper: Get guild ID from connection or global voiceHandler
function getGuildId(connection) {
	return connection?.guild?.id || connection?.joinConfig?.guildId || Array.from(global.voiceHandler?.connections?.keys())?.[0];
}

// Helper: Play local audio file (TTS, SFX, etc.)
async function playLocalFile(audioLink, queue, song) {
	const { createAudioPlayer, createAudioResource, AudioPlayerStatus } = await import('@discordjs/voice');
	const { createReadStream } = await import('fs');
	let guildId = getGuildId(global.connection);
	const modernConnection = global.voiceHandler?.getConnection(guildId);
	let cleanupFn = null;
	// If this is a TTS file, it may be an object with path/cleanup
	if (typeof song.audioObj === 'object' && song.audioObj.path && song.audioObj.cleanup) {
		audioLink = song.audioObj.path;
		cleanupFn = song.audioObj.cleanup;
	}
	if (modernConnection) {
		const player = createAudioPlayer();
		const resource = createAudioResource(createReadStream(audioLink));
		player.play(resource);
		modernConnection.subscribe(player);
		player.on(AudioPlayerStatus.Playing, () => {
			console.log('Queue audio is playing');
		});
		player.on(AudioPlayerStatus.Idle, async () => {
			console.log('Queue audio finished');
			if (cleanupFn) await cleanupFn();
			queue.endDispatcher(player);
		});
		player.on('error', async (error) => {
			console.error('Queue audio player error:', error);
			if (cleanupFn) await cleanupFn();
			queue.endDispatcher(player);
		});
		// Timed playback
		let counter = getAudioLength(song);
		if (counter > 0) {
			setTimeout(async () => {
				player.stop();
				if (cleanupFn) await cleanupFn();
				queue.endDispatcher(player);
			}, counter * 1000);
		}
	} else {
		console.log('No modern voice connection available, retrying in 2 seconds...');
		setTimeout(() => queue.play(), 2000);
	}
}

// Helper: Play YouTube audio
async function playYouTube(audioLink, queue, song) {
	const { createAudioPlayer, createAudioResource, AudioPlayerStatus } = await import('@discordjs/voice');
	const { stream: playDlStream } = await import('play-dl');
	let guildId = getGuildId(global.connection);
	const modernConnection = global.voiceHandler?.getConnection(guildId);
	if (modernConnection) {
		const streamInfo = await playDlStream(audioLink, { quality: 2 });
		const resource = createAudioResource(streamInfo.stream, { inputType: streamInfo.type });
		const player = createAudioPlayer();
		player.play(resource);
		modernConnection.subscribe(player);
		player.on(AudioPlayerStatus.Playing, () => {
			console.log('YouTube audio is playing');
		});
		player.on(AudioPlayerStatus.Idle, () => {
			console.log('YouTube audio finished');
			queue.endDispatcher(player);
		});
		player.on('error', (error) => {
			console.error('YouTube player error:', error);
			queue.endDispatcher(player);
		});
		let counter = getAudioLength(song);
		if (counter > 0) {
			setTimeout(() => {
				player.stop();
				queue.endDispatcher(player);
			}, counter * 1000);
		}
	} else {
		console.log('No voice connection available for YouTube playback');
		queue.endDispatcher(null);
	}
}

// Helper: Get audio length in seconds
function getAudioLength(song) {
	let audioLength = song.length;
	let counter = 0;
	if (audioLength && audioLength !== '0s') {
		if (isNaN(audioLength) && audioLength.indexOf('s') > -1) {
			counter = parseInt(audioLength.split('s')[0]);
		} else {
			counter = parseInt(audioLength);
		}
	}
	return counter;
}
'use strict';

// Modern YouTube audio extraction
import { stream as playDlStream, video_info } from 'play-dl';
import { hypeResponse } from '../hypeResponse/hype_response.js';
import { createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import { createReadStream } from 'fs';

let isPlaying = false;
class QElement {
	constructor(element, priority) {
		this.element = element;
		this.priority = priority;
	}
}

export default class PriorityQueue {

	// An array is used to implement priority 
	constructor() {
		this.items = [];
	}

	checkAudioObj(audio) {
		if (!audio.url)
			{return false;}
		if (!audio.start)
			{audio.start = '0s';}
		if (!audio.length && audio.url.indexOf('youtube') > -1)
			{audio.length = 30;}

		return audio;
	}

	enqueue(element, priority) {
		// creating object from queue element
		console.log('ENQUEING ELEMENT');
		console.log(element);
		let audioObj = this.checkAudioObj(element);

		if (!audioObj) {
			console.log('Bad Audio Link: ' + element);
			return;
		}

		var qElement = new QElement(audioObj, priority);
		var contain = false;

		// iterating through the entire 
		// item array to add element at the 
		// correct location of the Queue 
		for (var i = 0; i < this.items.length; i++) {
			if (this.items[i].priority > qElement.priority) {
				// Once the correct location is found it is 
				// enqueued 
				this.items.splice(i, 0, qElement);
				contain = true;
				break;
			}
		}

		// if the element have the highest priority 
		// it is added at the end of the queue 
		if (!contain) {
			this.items.push(qElement);
		}

		if (this.isPlaying() === false) {
			isPlaying = true;
			this.play();
		}

	}

	dequeue() {
		if (this.isEmpty()) {
			return 'Underflow';
		}
		return this.items.shift();
	}

	front() {
		if (this.isEmpty()) {
			return 'No elements in Queue';
		}
		return this.items[0];
	}


	rear() {
		if (this.isEmpty()) {
			return 'No elements in Queue';
		}
		return this.items[this.items.length - 1];
	}

	isEmpty() {
		return this.items.length == 0;
	}

	isPlaying() {
		return isPlaying;
	}

	printPQueue() {
		var str = '';
		for (var i = 0; i < this.items.length; i++) {
			str += this.items[i].element + ' ';
		}
		return str;
	}

	getSongInfo() {
		return this.front().element;
	}

	endDispatcher(dispatcher) {
		// Handle both old dispatchers and null (for commented out functionality)
		if (dispatcher && typeof dispatcher.destroy === 'function') {
			dispatcher.destroy();
		}

		this.dequeue();
		console.log(this);
		console.log(this.isEmpty());
		if (!this.isEmpty()) {
			this.play();
		} else {
			isPlaying = false;
		}
	}
// {'url': url, '', 'start': '0s', 'length': 30 }
async play() {
	console.log('CURRENT QUEUE');
	console.log(this);
	let queue = this;
	let song = this.getSongInfo();
	let audioLink = song.url;
	isPlaying = true;
	// Play local file (TTS, SFX, etc.)
	if (audioLink.indexOf('youtube') === -1 && audioLink.indexOf('http') === -1) {
		await playLocalFile(audioLink, queue, song);
	} else if (audioLink.indexOf('youtube') > -1) {
		await playYouTube(audioLink, queue, song);
	} else {
		// Other URL types not supported yet
		console.log('URL playback not yet supported:', audioLink);
		setTimeout(() => {
			this.endDispatcher(null);
		}, 1000);
	}
}
};
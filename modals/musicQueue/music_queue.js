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
		let audioStart = song.start;
		let audioLength = song.length;
		let connection = global.connection;
		let counter;

		isPlaying = true;

		// Check if it's a local file (TTS responses, sound effects, etc.)
		if (audioLink.indexOf('youtube') === -1 && audioLink.indexOf('http') === -1) {
			console.log('PLAYING LOCAL AUDIO FILE');
			console.log(audioLink);
			
			// Use modern Discord.js voice API for local files
			try {
				// Get the modern voice connection from the voice handler
				// Try to get guild ID from multiple sources
				let guildId = connection?.guild?.id || 
				             connection?.joinConfig?.guildId || 
				             Array.from(global.voiceHandler?.connections?.keys())?.[0];
				
				console.log('Looking for connection with guild ID:', guildId);
				const modernConnection = global.voiceHandler?.getConnection(guildId);
				
				if (modernConnection) {
					console.log('Found modern connection, creating player');
					const player = createAudioPlayer();
					const resource = createAudioResource(createReadStream(audioLink));
					
					player.play(resource);
					modernConnection.subscribe(player);
					
					player.on(AudioPlayerStatus.Playing, () => {
						console.log('Queue audio is playing');
					});
					
					player.on(AudioPlayerStatus.Idle, () => {
						console.log('Queue audio finished');
						this.endDispatcher(player);
					});
					
					player.on('error', (error) => {
						console.error('Queue audio player error:', error);
						this.endDispatcher(player);
					});
					
					// Handle timed playback if specified
					if (audioLength && audioLength !== '0s') {
						if (isNaN(audioLength) && audioLength.indexOf('s') > -1) {
							counter = parseInt(audioLength.split('s')[0]);
						} else {
							counter = parseInt(audioLength);
						}
						
						if (counter > 0) {
							setTimeout(() => {
								player.stop();
								this.endDispatcher(player);
							}, counter * 1000);
						}
					}
				} else {
					console.log('No modern voice connection available, retrying in 2 seconds...');
					console.log('Available connections:', Array.from(global.voiceHandler?.connections?.keys() || []));
					// Retry after a short delay
					setTimeout(() => {
						// Try again with any available connection
						const availableGuildIds = Array.from(global.voiceHandler?.connections?.keys() || []);
						if (availableGuildIds.length > 0) {
							const retryConnection = global.voiceHandler?.getConnection(availableGuildIds[0]);
							if (retryConnection) {
								console.log('Retry successful - playing audio with guild:', availableGuildIds[0]);
								const player = createAudioPlayer();
								const resource = createAudioResource(createReadStream(audioLink));
								
								player.play(resource);
								retryConnection.subscribe(player);
								
								player.on(AudioPlayerStatus.Playing, () => {
									console.log('Queue audio is playing (retry)');
								});
								
								player.on(AudioPlayerStatus.Idle, () => {
									console.log('Queue audio finished (retry)');
									this.endDispatcher(player);
								});
								
								player.on('error', (error) => {
									console.error('Queue audio player error (retry):', error);
									this.endDispatcher(player);
								});
							} else {
								console.log('Retry failed - connection not usable');
								this.endDispatcher(null);
							}
						} else {
							console.log('Retry failed - no connections available');
							this.endDispatcher(null);
						}
					}, 2000);
				}
			} catch (error) {
				console.error('Error playing local audio:', error);
				this.endDispatcher(null);
			}
		} else if (audioLink.indexOf('youtube') > -1) {
			// Modern YouTube playback using play-dl
			console.log('PLAYING YOUTUBE AUDIO');
			console.log(`URL: ${audioLink}, Start: ${audioStart}, Length: ${audioLength}`);
			
			try {
				// Get the modern voice connection
				let guildId = connection?.guild?.id || 
				             connection?.joinConfig?.guildId || 
				             Array.from(global.voiceHandler?.connections?.keys())?.[0];
				
				const modernConnection = global.voiceHandler?.getConnection(guildId);
				
				if (modernConnection) {
					console.log('Getting YouTube stream info...');
					
					// Get stream info and create audio resource
					const streamInfo = await playDlStream(audioLink, { quality: 2 }); // Quality 2 = good audio quality
					const resource = createAudioResource(streamInfo.stream, {
						inputType: streamInfo.type
					});
					
					const player = createAudioPlayer();
					player.play(resource);
					modernConnection.subscribe(player);
					
					player.on(AudioPlayerStatus.Playing, () => {
						console.log('YouTube audio is playing');
					});
					
					player.on(AudioPlayerStatus.Idle, () => {
						console.log('YouTube audio finished');
						this.endDispatcher(player);
					});
					
					player.on('error', (error) => {
						console.error('YouTube player error:', error);
						this.endDispatcher(player);
					});
					
					// Handle timed playback if specified
					if (audioLength && audioLength !== '0s') {
						let counter;
						if (isNaN(audioLength) && audioLength.indexOf('s') > -1) {
							counter = parseInt(audioLength.split('s')[0]);
						} else {
							counter = parseInt(audioLength);
						}
						
						if (counter > 0) {
							console.log(`YouTube audio will play for ${counter} seconds`);
							setTimeout(() => {
								player.stop();
								this.endDispatcher(player);
							}, counter * 1000);
						}
					}
				} else {
					console.log('No voice connection available for YouTube playback');
					this.endDispatcher(null);
				}
			} catch (error) {
				console.error('Error playing YouTube audio:', error);
				console.error('This might be due to YouTube restrictions or invalid URL');
				this.endDispatcher(null);
			}
		} else {
			// Other URL types not supported yet
			console.log('URL playback not yet supported:', audioLink);
			setTimeout(() => {
				this.endDispatcher(null);
			}, 1000);
		}
	}
};
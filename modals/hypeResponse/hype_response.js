import { stream as playDlStream } from 'play-dl';
import { genericResponse } from '../genericResponse/generic_response.js';
import { createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';


function endDispatcher(dispatcher, queued) {
	if (queued) {
		console.log('END DISPATCHER IN HYPE')
		global.pQueue.endDispatcher(dispatcher);
	}
}

async function playHype(link, start, length, queued = false) {
	console.log(`Playing hype: ${link} starting at ${start} for ${length}s`);
	
	try {
		// Get modern voice connection
		let guildId = global.connection?.guild?.id || 
		             global.connection?.joinConfig?.guildId || 
		             Array.from(global.voiceHandler?.connections?.keys())?.[0];
		
		const modernConnection = global.voiceHandler?.getConnection(guildId);
		
		if (!modernConnection) {
			console.error('No voice connection available for hype');
			return;
		}

		let counter = false;
		if (length && isNaN(length) && length.indexOf('s') > -1) {
			counter = parseInt(length.split('s')[0]);
		} else {
			counter = parseInt(length);
		}

		// Create audio player
		const player = createAudioPlayer();
		let resource;

		if (link && link.indexOf('youtube') > -1) {
			console.log('Getting YouTube stream for hype...');
			const streamInfo = await playDlStream(link, { quality: 2 });
			resource = createAudioResource(streamInfo.stream, {
				inputType: streamInfo.type
			});
		} else {
			// For local files or other sources
			resource = createAudioResource(link);
		}

		player.play(resource);
		modernConnection.subscribe(player);

		player.on(AudioPlayerStatus.Idle, () => {
			endDispatcher(player, queued);
		});

		player.on('error', (error) => {
			endDispatcher(player, queued);
		});

		// Handle timed playback
		if (counter && counter > 0) {
			console.log(`Hype will play for ${counter} seconds`);
			setTimeout(() => {
				player.stop();
				endDispatcher(player, queued);
			}, counter * 1000);
		}

	} catch (error) {
		console.error('Error playing hype audio:', error);
		if (queued) {
			endDispatcher(null, queued);
		}
	}
}

function randomIntInc(low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}

function grabInfo(message) {
	let info = {};
	let msgArr = message.split(' ');
	if (msgArr.length === 1) {
		info.song = message;
	} else {
		let linkAndTime = message.split(' ');

		info.song = linkAndTime[2];
		if (linkAndTime.length > 3) {
			info.startTime = linkAndTime[3];
		}
	}
	return info;
}

export async function hypeResponse(message, connection, list = false, len = 30, start) {
	if (list) {
		let audioLink = message.url;
		let audioStart = message.start;
		let audioLength = message.length;
		await playHype(audioLink, audioStart, audioLength, true);
	} else {

		if (typeof message === 'object') {
			if (message.author.username === 'Dnoop' && message.content.toLowerCase() == '!dave hype') {
				// Use modern queue system instead of direct playback
				message.channel.send('🔥 HYPE MUSIC INCOMING! 🔥');
				
				var newRando = randomIntInc(1, 3);
				let hypeTrack;

				switch (newRando) {
					case 1:
						hypeTrack = {
							'url': 'https://www.youtube.com/watch?v=ze5W8cDHcsQ',
							'start': '26s',
							'length': len
						};
						break;
					case 2:
						hypeTrack = {
							'url': 'https://www.youtube.com/watch?v=GoCOg8ZzUfg',
							'start': '50s',
							'length': len
						};
						break;
					case 3:
						hypeTrack = {
							'url': 'https://www.youtube.com/watch?v=VDvr08sCPOc',
							'start': '0s',
							'length': len
						};
						break;
					default:
						genericResponse(message, 'How dare you speak to me');
						return;
				}

				// Queue the hype track
				global.pQueue.enqueue(hypeTrack, 1); // High priority

			} else if (message.content.toLowerCase().indexOf('!dave play') > -1) {
				const msgArr = message.content.split(' ');
				let songInfo = grabInfo(message.content);

				global.pQueue.enqueue({ 
					'url': songInfo.song, 
					'start': songInfo.startTime || '0s', 
					'length': 30 
				}, 2);
				message.channel.send('🎵 Queued: ' + songInfo.song + ' (requested by ' + message.author.displayName + ')');
			}
		} else {
			await playHype(message, start, len);
		}
	}
}
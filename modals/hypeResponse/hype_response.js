import ytdl, { getInfo } from 'ytdl-core';
import genericResponse, { say } from '../genericResponse/generic_response.js';
var fs = require('fs');


function endDispatcher(dispatcher, queued) {
	if (queued) {
		console.log('END DISPATCHER IN HYPE')
		global.pQueue.endDispatcher();
	}
}

function playHype(link, start, length, queued = false) {
	let counter = false;

	if (length && isNaN(length) && length.indexOf('s') > -1) {
		counter = length.split('s')[0];
	} else {
		counter = length;
	}

	let stream = link;

	if (link && link.indexOf('youtube') > -1) {
		console.log('start: ' + start)
		stream = ytdl(link, {
			begin: start,
		});
	}

	let dispatcher = global.connection.playFile(stream, {
		seek: 6,
		volume: 0.8
	});

	dispatcher.on('start', () => {
		global.connection.player.streamingData.pausedTime = 0;
	});

	dispatcher.on('end', () => {
		endDispatcher(dispatcher, queued)
	});

	dispatcher.on('error', console.error);
	if (counter) {
		var playTime = setInterval(function() {
			counter--;
			if (counter === 0) {
				clearInterval(playTime);
				dispatcher.end();
				endDispatcher(dispatcher, queued);
			}
		}, 1000);
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

export function hypeResponse(message, connection, list = false, len = 30, start) {
	if (list) {
		let audioLink = message.url;
		let audioStart = message.start;
		let audioLength = message.length;
		playHype(audioLink, audioStart, audioLength, true);
	} else {

		if (typeof message === 'object') {
			if (message.author.username === 'Dnoop' && message.content.toLowerCase() === '!dave hype') {
				// say(message, 'Calling all Fraggers');
				var newRando = randomIntInc(1, 3);

				switch (true) {
					case newRando === 1:
						playHype('https://www.youtube.com/watch?v=ze5W8cDHcsQ', '26s', len);
						break;
					case newRando === 2:
						playHype('https://www.youtube.com/watch?v=GoCOg8ZzUfg', '50s', len);
						break;
					case newRando === 3:
						playHype('https://www.youtube.com/watch?v=VDvr08sCPOc', '0s', len);
						break;
					default:
						genericResponse(message, 'How dare you speak to me');
						break;
				}

			} else if (message.content.toLowerCase().indexOf('!dave play') > -1) {
				const msgArr = message.content.split(' ');
				let songInfo = grabInfo(message.content);

				global.pQueue.enqueue({ 'url': songInfo.song, 'start': songInfo.startTime, 'length': 30 }, 2);
				message.channel.send('Playing ' + songInfo.song + ' sent to me by ' + message.author);
			}
		} else {
			playHype(message, start, len);
		}
	}
}
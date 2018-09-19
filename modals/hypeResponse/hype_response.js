import ytdl, { getInfo } from 'ytdl-core';
import { play } from '../musicQueue/music_queue.js';
import genericResponse, { say } from '../genericResponse/generic_response.js';


function endDispatcher(dispatcher){
	dispatcher.end();
}

function playHype(link, start, length) {
	let counter;
	console.log(length);
	console.log(typeof length);
	if (isNaN(length) && length.indexOf('s') > -1) {
		counter = length.split('s')[0];
	} else {
		counter = length;
	}
	let stream = link;

	if(link.indexOf('youtube') > -1){
		stream = ytdl(link, {
			begin: start,
		});
	}

	let dispatcher = global.connection.playStream(stream, {
		seek: 3,
		volume: 0.2
	});

	dispatcher.on('start', () => {
		global.connection.player.streamingData.pausedTime = 0;
	});

	dispatcher.on('error', console.error);

	var playTime = setInterval(function() {
		counter--;
		if (counter === 0) {
			clearInterval(playTime);
			endDispatcher(dispatcher);
		}
	}, 1000);

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
	if (typeof message === 'object') {
		if (message.author.username === 'Dnoop' && message.content.toLowerCase() === '!dave hype') {
			say(message, 'Calling all Fraggers');
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

			console.log(songInfo);
			console.log(JSON.stringify(songInfo));
			playHype(songInfo.song, songInfo.startTime || '0s', '15s');
			// if (msgArr.length > 1) {
			// 	song = message.content.split(' ')[2];
			// } else {
			// 	song = message;
			// }

			// getInfo(song, (err, info) => {
			// 	if (err) {
			// 		return err;
			// 	}

			// 	list.add({ url: song, title: info.title, votes: 0, user: message.author.username });

			// 	play(list.head, connection, message);
			// });
		}
	} else {
		console.log('here');
		console.log(message);
		console.log(start);
		console.log(len);
		playHype(message, start, len);
	}
}

import ytdl, { getInfo } from 'ytdl-core';
import { play } from '../musicQueue/music_queue.js';
import genericResponse, { say } from '../genericResponse/generic_response.js';


function playHype(link, start, length, connection) {
	var counter = length;
	const stream = ytdl(link, {
		begin: start,
	});

	const dispatcher = connection.playStream(stream, {
		seek: 0,
		volume: 0.1
	});
	var timer = setInterval(function() {
		counter--;
		if (counter === 0) {
			dispatcher.end();
			clearInterval(timer);
		}
	}, 1000);

}

function randomIntInc(low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}

export function hypeResponse(message, connection, list = false) {
	if(message.author.username === 'Dnoop' && message.content.toLowerCase() === '!dave hype'){
		say(message, 'Calling all Fraggers');
		var newRando = randomIntInc(1, 3);
		
		switch(true) {		
			case newRando === 1:
				playHype('https://www.youtube.com/watch?v=ze5W8cDHcsQ', '26s', 30, connection);
				break;
			case newRando === 2:
				playHype('https://www.youtube.com/watch?v=GoCOg8ZzUfg', '50s', 40, connection);
				break;
			case newRando === 3:
				playHype('https://www.youtube.com/watch?v=VDvr08sCPOc', '0s', 30, connection);
				break;
			default:
				genericResponse(message, 'How dare you speak to me');
				break;
		}

	 } else if (message.content.toLowerCase().indexOf('!dave play') > -1) {
		var song = message.content.split(' ')[2];

		getInfo(song, (err, info) => {
			if (err) {
				return err;
			}
			list.add({ url: song, title: info.title, votes: 0, user: message.author.username });

			play(list.head, connection, message);
		});
	}
}

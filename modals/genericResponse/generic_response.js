function randomIntInc(low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}

export function genericResponse (message, toSend = false) {
	if (toSend === false) {
		var rando = randomIntInc(1, 3);
		if (rando === 1) {
			message.reply('solo que');
			message.channel.send('solo quee', {
				tts: true
			});
		} else if (rando === 2) {
			message.reply('lingerie');
		} else {
			message.reply('*Ice cubes clattering in a glass*');
		}
	}else{
		message.reply(toSend);
	}
}

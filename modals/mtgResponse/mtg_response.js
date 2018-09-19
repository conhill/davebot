import { card } from 'mtgsdk';
import { RichEmbed } from 'discord.js';

function randomIntInc(low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}

export function mtgResponse(message){
	var rando = randomIntInc(1, 5000);

	card.find(rando, 'all').then(result2 => {
		const embed = new RichEmbed()
			.setTitle(result2.card.name)
			.setColor(0x00AE86)
			.setDescription(result2.card.name)
			.setImage(result2.card.imageUrl)
			.setTimestamp();

		message.channel.send({
			embed
		});
		return result2.card;
	});
}

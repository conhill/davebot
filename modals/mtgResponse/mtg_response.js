import { card } from 'mtgsdk';
import { RichEmbed } from 'discord.js';

function randomIntInc(low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}

export function mtgResponse(message) {

	var request = require('request');

	request({ url: 'https://api.scryfall.com/cards/random', json: true }, function(err, res, card) {
		if (err) {
			throw err;
		}
		const embed = new RichEmbed()
			.setTitle(card.name)
			.setColor(0x00AE86)
			.setDescription(card.name)
			.setImage(card.image_uris.large)
			.setTimestamp();

		message.channel.send({
			embed
		});
	});

}
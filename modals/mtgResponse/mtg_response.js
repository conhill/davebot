import { EmbedBuilder } from 'discord.js';

function randomIntInc(low, high) {
	return Math.floor(Math.random() * (high - low + 1) + low);
}

export async function mtgResponse(message) {
	try {
		// Use modern fetch API instead of deprecated request library
		const response = await fetch('https://api.scryfall.com/cards/random');
		const card = await response.json();
		
		const embed = new EmbedBuilder()
			.setTitle(card.name)
			.setColor(0x00AE86)
			.setDescription(card.name)
			.setImage(card.image_uris.large)
			.setTimestamp();

		// Send the card embed first
		await message.channel.send({
			embeds: [embed]
		});

		// Get AI analysis if available
		if (global.aiHandler) {
			try {
				const analysis = await global.aiHandler.analyzeMTGCard(card);
				if (analysis) {
					// Clean up awkward greetings from Gemini AI
					let cleanAnalysis = analysis.replace(/^hey there[!,. ]*/i, '').replace(/^hey guys[!,. ]*/i, '');
					// Generate TTS response with the cleaned AI analysis
					if (global.ttsHandler) {
						const audioPath = await global.ttsHandler.generatePersonalizedResponse(
							cleanAnalysis,
							message.author.id
						);
						if (audioPath && global.pQueue) {
							global.pQueue.enqueue({
								'url': audioPath,
								'start': '0s'
							}, 1);
						}
					}
					// Also send the analysis as text
					// message.channel.send(`🎲 **Dave's Take:** ${cleanAnalysis}`);
				} else {
					// Fallback to simple TTS without AI
					const fallbackResponse = `Nice pull! ${card.name} is a ${card.type_line}. What do you think of this one?`;
					if (global.ttsHandler) {
						const audioPath = await global.ttsHandler.generatePersonalizedResponse(
							fallbackResponse,
							message.author.id
						);
						
						if (audioPath && global.pQueue) {
							global.pQueue.enqueue({
								'url': audioPath,
								'start': '0s'
							}, 1);
						}
					}
				}
			} catch (error) {
				console.error('Error in MTG AI analysis:', error);
			}
		}
	} catch (error) {
		console.error('Error fetching MTG card:', error);
		message.channel.send('Sorry, having trouble getting a card right now. Try again in a bit!');
	}
}
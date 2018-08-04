export function helpResponse(message){

	const embed = {
		color: 3447003,
		author: {
			name: 'DaveBot',
			icon_url: 'attachment://dave.jpg'
		},
		title: 'DaveBot Help Menu',
		description: 'This is a list of current Davebot Commands.',
		fields: [{
			name: '!dave mtg',
			value: 'Generates a random MTG card to chat'
		},
		{
			name: '!dave play {youtube_link}',
			value: 'DaveBot plays will play a youtube video'
		},
		{
			name: '!dave',
			value: 'DaveBot will say some classic DaveBot phrases'
		}],
		timestamp: new Date(),
	};

	message.channel.send({ embed, files: [{ attachment: './images/dave.jpg', name: 'dave.jpg' }] });
	
}

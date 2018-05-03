'use strict';

const Discord = require('discord.js');
const bot = new Discord.Client();
const mtg = require('mtgsdk');
const ytdl = require('ytdl-core');

var isReady = true;
const streamOptions = {
	seek: 0,
	volume: .5
};

//Songs = require('./models/songs');

//Alert for when bot is online
bot.on('ready', () => {
	console.log('I am ready!');
	//app.listen(3000);
	console.log('running on port 3000');
	// JoinChannel('374375554268397568');
	// let channel = bot.channels.get('374375554268397568');

	var JoinChannel = function(id) {
		let channel = bot.channels.get(id);
		channel.join()
			.then(function(connection) {

				//Rage Quit
				bot.on('voiceStateUpdate', (oldMember, newMember) => {
					let newUserChannel = newMember.voiceChannel;
					let oldUserChannel = oldMember.voiceChannel;
					if (isReady) {
						if (oldUserChannel === undefined && newUserChannel !== undefined) {
							//new user
						} else if (newUserChannel === undefined) {
							isReady = false;
							const stream = ytdl('https://www.youtube.com/watch?v=2LXRKTjpDm8', {
								filter: 'audioonly'
							});

							const dispatcher = connection.playStream(stream, streamOptions);
							dispatcher.on('end', end => {  // eslint-disable-line no-unused-vars
								isReady = true;
							});
						}
					}
				});


				bot.on('message', message => {
					//Generic !Dave command
					if (message.content.toLowerCase() === '!dave') {
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

					}

					if (message.content.toLowerCase().indexOf('!dave play') > -1) {
						playHype(message.content.split(' ')[message.content.split(' ').length - 1], '30s', 30);
					}


					//This seems to fail randomly
					if (message.content.toLowerCase() === '!dave mtg') {
						var rando22 = randomIntInc(1, 5000);

						mtg.card.find(rando22, 'all')
							.then(result2 => {
								const embed = new Discord.RichEmbed()
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

					if (message.content.toLowerCase() === '!dave hype' && message.author.username === 'Dnoop') {
						message.channel.send('Calling all Fraggers ');
						var newRando = randomIntInc(1, 3);

						if (newRando === 1) {
							playHype('https://www.youtube.com/watch?v=ze5W8cDHcsQ', '26s', 30);
						} else if (newRando === 2) {
							playHype('https://www.youtube.com/watch?v=GoCOg8ZzUfg', '50s', 40);
						} else if (newRando === 3) {
							playHype('https://www.youtube.com/watch?v=VDvr08sCPOc', '0s', 30);
						}
					}
				});

				function randomIntInc(low, high) {
					return Math.floor(Math.random() * (high - low + 1) + low);
				}

				function playHype(link, start, length) {
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



			}).catch(console.log);
	};

	JoinChannel('189914746408009728');
});

bot.login('MzM3MzU5Mjc0MjQwMTE0Njg4.DFJJ4w.TKEe--uuNwNhluzoWNFsfHafHwo');
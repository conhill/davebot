'use strict';

import { Client } from 'discord.js';
const bot = new Client();
import ytdl, { getInfo } from 'ytdl-core';
import { genericResponse } from './modals/genericResponse/generic_response.js';
import { hypeResponse } from './modals/hypeResponse/hype_response.js';
import { mtgResponse } from './modals/mtgResponse/mtg_response.js';
import { helpResponse } from './modals/helpResponse/help_response.js';
import musicQueue, { add, play } from './classes/musicQueue.js';

import 'dotenv/config';


let isReady = true;
const streamOptions = {
	seek: 0,
	volume: .5
};

var fireReady = () => {
	console.log('I am ready!');
	console.log('running on port 3000');
};

//Alert for when bot is online
bot.on('ready', () => {

	fireReady();

	var JoinChannel = function (id) {
		let channel = bot.channels.get(id);
		const list = new musicQueue;

		channel.join()
			.then(function (connection) {

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
							dispatcher.on('end', end => { // eslint-disable-line no-unused-vars
								isReady = true;
							});
						}
					}
				});


				bot.on('message', message => {
					//Generic !Dave command
					if (message.content.toLowerCase() === '!dave') {
						genericResponse(message);
					}

					//Play a song
					if (message.content.toLowerCase().indexOf('!dave play') > -1) {
						hypeResponse(message, connection, list);
					}

					//This seems to fail randomly
					if (message.content.toLowerCase() === '!dave mtg') {
						mtgResponse(message);
					}

					//This seems to fail randomly
					if (message.content.toLowerCase() === '!dave help') {
						helpResponse(message);
					}

					//Play hype music
					if (message.content.toLowerCase() === '!dave hype' && message.author.username === 'Dnoop') {
						hypeResponse(message, connection);
					}

					//Queue up song
					if (message.content.toLowerCase().indexOf('!dave queue') > -1) {
						var song = message.content.split(' ')[2];
						getInfo(song, (err, info) => {
							if (err) {
								return err;
							}
							add({
								url: song,
								title: info.title,
								votes: 0,
								user: message.author.username
							});
						});
					}
					if (message.content.toLowerCase().indexOf('!dave test') > -1) {
						play(list.head, connection, message);
					}
				});

			}).catch(console.log);
	};

	JoinChannel(process.env.VOICEROOM);
});

bot.login(process.env.ROOMKEY);

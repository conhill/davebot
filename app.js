'use strict';

var express = require('express');
var wtf = require('wtfnode');
import { Client } from 'discord.js';
// import Crunker from 'crunker';
const bot = new Client({ autoReconnect: true });
import ytdl, { getInfo } from 'ytdl-core';
import { genericResponse } from './modals/genericResponse/generic_response.js';
import { hypeResponse } from './modals/hypeResponse/hype_response.js';
import { mtgResponse } from './modals/mtgResponse/mtg_response.js';
import { helpResponse } from './modals/helpResponse/help_response.js';
// import musicQueue, { add, play } from './classes/musicQueue.js';
import { onOpus, recordAudio } from './js/voice.js';
// import { Queue } from './modals/musicQueue/music_queue.js'
import PriorityQueue from './modals/musicQueue/music_queue.js'



import 'dotenv/config';


let isReady = true;
const opus = require('node-opus');
const path = require('path');
const recordingsPath = './recordings';
const fs = require('fs');
var listenStreams = new Map();
let originalPath;

/* Global Variables */

global.connection;
global.channel;
global.userTalking = false;
global.pQueue = new PriorityQueue();
global.streaming = false;
global.reLoggedOnce = false;

/******************/
const streamOptions = {
	seek: 0,
	volume: .5
};


var fireReady = () => {
	console.log('I am ready!');
	console.log('running on port 3000');
};

//re-log
var logBackIn = (bot, channel, cb) => {
	if (!global.reLoggedOnce) {
		global.reLoggedOnce = true;

		setTimeout(function() {
			cb();
		}, 500);

	} else {
		console.log('NOW TRUE');
		cb();
	}
}

//Alert for when bot is online
bot.on('ready', () => {

	fireReady();

	var JoinChannel = function(id) {
		global.channel = bot.channels.get(id);

		global.channel.join()
			.then(function(connection) {

				global.connection = connection;

				let receiver = connection.createReceiver();

				global.pQueue.enqueue({ 'url': './sound/icecubes.mp3', 'start': '0s' }, 1);

				//When A User is Speaking
				if (global.userTalking === false) {

					global.connection.on('speaking', (user, speaking) => {
						if (user.username === 'Dnoop' && !global.pQueue.isPlaying()) {
							global.userTalking = true;
							recordAudio(user, speaking);
						}
					});

					receiver.on('opus', function(user, data) {
						onOpus(user, data);
					});
				}

				//Rage Quit
				bot.on('voiceStateUpdate', (oldMember, newMember) => {
					let newUserChannel = newMember.voiceChannel;
					let oldUserChannel = oldMember.voiceChannel;
					// if (isReady) {
					if (oldUserChannel === undefined && newUserChannel !== undefined) {
						let song;
						if (global.streaming === true) {
							global.channel.send("I'm streaming, dont say anything too racist");
						}
						switch (true) {
							case newMember.displayName === 'NuclearLink':
								song = 'https://www.youtube.com/watch?v=6FFH3lOP_9M';
								// hypeResponse(song, connection, list, 30, '15s');
								global.pQueue.enqueue({ 'url': song, 'start': '15s', 'length': 30 }, 2);
								break;
							case newMember.displayName === 'Price of Quality':
								song = 'https://www.youtube.com/watch?v=eHd7yjgSxj4';
								global.pQueue.enqueue({ 'url': song, 'start': '5s', 'length': 30 }, 2);
								break;
							case newMember.displayName === 'tagowar':
								song = 'https://www.youtube.com/watch?v=ITQB_n9bqCc';
								global.pQueue.enqueue({ 'url': song, 'start': '17s', 'length': 30 }, 2);
								break;
							case newMember.displayName === 'bbp':
								song = 'https://www.youtube.com/watch?v=U9FzgsF2T-s';
								hypeResponse(song, connection, false, 30, '17s');
								break;
							case newMember.displayName === 'KingKoopa':
								song = '/https://www.youtube.com/watch?v=SzTX5E1t8og';
								hypeResponse(song, connection, false, 30, '0s');
								break;
							default:
								console.warn(`${newMember.displayName}! Joined. No song`);
								break;
						}
						//new user
					} else if (newUserChannel === undefined) {

						let rage = 'https://www.youtube.com/watch?v=2LXRKTjpDm8';
						// hypeResponse(rage, connection, false);
						lobal.pQueue.enqueue({ 'url': rage, 'start': '0s' }, 2);
					}
					// }
				});


				bot.on('message', message => {
					let messageLowerCase = message.content.toLowerCase();
					//Generic !Dave command
					if (messageLowerCase === '!dave')
						genericResponse(message);

					//Play a song
					if (messageLowerCase.indexOf('!dave play') > -1) {
						if (messageLowerCase.indexOf('youtu.be') === -1) {
							let song = message.content.split(' ')[2];
							global.pQueue.enqueue({ 'url': song, 'start': '0s', 'length': 30 }, 2);
							// hypeResponse(message, connection, false, 60);
							message.delete();
						} else if (messageLowerCase.indexOf('youtu.be') > -1) {
							message.channel.send('Wrong youtube link, idiot.');
						}
					}

					//This seems to fail randomly
					if (messageLowerCase === '!dave mtg')
						mtgResponse(message);

					//This seems to fail randomly
					if (messageLowerCase === '!dave help')
						helpResponse(message);

					//Play hype music
					if (messageLowerCase === '!dave hype' && message.author.username === 'Dnoop') {
						message.channel.send('@everyone');
						hypeResponse(message, connection, false, 20);
					}

					//Queue up song
					if (messageLowerCase.indexOf('!dave queue') > -1) {
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

					if (messageLowerCase.indexOf('!dave test') > -1) {
						play(list.head, connection, message);
					}
				});


			}).catch(console.log);
	}

	JoinChannel(process.env.VOICEROOM);
});


bot.login(process.env.ROOMKEY);
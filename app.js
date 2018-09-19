'use strict';

var express = require('express');
import { Client } from 'discord.js';
const bot = new Client();
import ytdl, { getInfo } from 'ytdl-core';
import { genericResponse } from './modals/genericResponse/generic_response.js';
import { hypeResponse } from './modals/hypeResponse/hype_response.js';
import { mtgResponse } from './modals/mtgResponse/mtg_response.js';
import { helpResponse } from './modals/helpResponse/help_response.js';
import musicQueue, { add, play } from './classes/musicQueue.js';
import { onOpus, recordAudio } from './js/voice.js';



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

/******************/
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

	var JoinChannel = function(id) {
		global.channel = bot.channels.get(id);
		const list = new musicQueue;

		global.channel.join()
			.then(function(connection) {
				
				//Set global connection
				global.connection = connection;
				const receiver = connection.createReceiver();


				//When A User is Speaking
				if (global.userTalking === false) { 
					global.connection.on('speaking', (user, speaking) => {
						// if (global.userTalking === false) {
						// 	console.log('switched to false');
						// }
						if (user.username === 'Dnoop') {
							global.userTalking = true;
							console.log('user talking turned on');
							recordAudio(user, speaking);
						}
					});

					receiver.on('opus', function(user, data) {
						// if(global.userTalking === false){
						onOpus(user, data);
						// }
					});
				}

				//Rage Quit
				bot.on('voiceStateUpdate', (oldMember, newMember) => {
					let newUserChannel = newMember.voiceChannel;
					let oldUserChannel = oldMember.voiceChannel;
					// if (isReady) {
					if (oldUserChannel === undefined && newUserChannel !== undefined) {
						let song;
						switch (true) {
							case newMember.displayName === 'NuclearLink':
								song = 'https://www.youtube.com/watch?v=liZm1im2erU';
								hypeResponse(song, connection, list, 15, '15s');
								break;
							case newMember.displayName === 'Another Scorcher':
								song = 'https://www.youtube.com/watch?v=79DijItQXMM';
								hypeResponse(song, connection, list, 18, '36s');
								break;
							case newMember.displayName === 'tagowar':
								song = 'https://www.youtube.com/watch?v=ITQB_n9bqCc';
								hypeResponse(song, connection, false, 17, '17s');
								break;
							default:
								console.warn(`${newMember.displayName}! Joined. No song`);
								break;
						}
						//new user
					} else if (newUserChannel === undefined) {
						// isReady = false;
							
						let rage = 'https://www.youtube.com/watch?v=2LXRKTjpDm8';
						hypeResponse(rage, connection, false);
					}
					// }
				});


				bot.on('message', message => {
					//Generic !Dave command
					if (message.content.toLowerCase() === '!dave') {
						genericResponse(message);
					}

					//Play a song
					if (message.content.toLowerCase().indexOf('!dave play') > -1) {
						hypeResponse(message, connection, false, 20);
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
						hypeResponse(message, connection, false, 20);
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

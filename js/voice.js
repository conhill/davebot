import * as discordJs from 'discord.js';
import {
	hypeResponse
} from '../modals/hypeResponse/hype_response.js';


import 'dotenv/config';
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const recordingsPath = './recordings';
const decode = require('../decodeOpus.js');
// const WitSpeech = require('node-witai-speech');
const fs = require('fs');
const search = require('youtube-search');
// let originalPath;

var listenStreams = new Map();

let basename;
let count = 0;
const BANNED_URLS = ['https://www.youtube.com/watch?v=UOxkGD8qRB4', 'https://www.youtube.com/watch?v=XbGs_qK2PQA'];

let dropifyThis = false;

function onOpus(user, data) {
	let hexString = data.toString('hex');
	let stream = listenStreams.get(user.id);
	if (!stream) {
		if (hexString === 'f8fffe') {
			return;
		}
		let outputPath = path.join(recordingsPath, `${user.id}-${Date.now()}.opus_string`);
		// originalPath = path.join(recordingsPath, `${user.id}-${Date.now()}.opus_string`);
		stream = fs.createWriteStream(outputPath);
		listenStreams.set(user.id, stream);
	}
	stream.write(`,${hexString}`);
}

Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

let rmDir = function(dirPath) {
	try {
		var files = fs.readdirSync(dirPath);
	} catch (e) {
		console.log(e);
		return;
	}

	if (files.length > 0) {
		for (var i = 0; i < files.length; i++) {
			var filePath = path.join(dirPath, files[i]);
			if (fs.statSync(filePath).isFile()) {
				fs.unlinkSync(filePath);
			}
		}
		global.userTalking = false;
		console.log('done cleaning');
	} else {
		rmDir(filePath);
	}
};

const deleteFolderRecursive = function(directory_path) {
	console.log('start deleting');
	if (fs.existsSync(directory_path)) {
		fs.readdirSync(directory_path).forEach(function(file) {
			var currentPath = path.join(directory_path, file);
			try {
				if (fs.lstatSync(currentPath).isDirectory()) {
					deleteFolderRecursive(currentPath);
				} else {
					if (fs.existsSync(currentPath)) {
						fs.unlinkSync(currentPath); // delete file
					}
				}
			} catch (e) {
				switch (e.code) {
					case 'EPERM':
						console.log('Did not have permission to check file/directory');
						break;
					case 'EBUSY':
						console.log('File is busy');
						break;
					default:
						console.log(e);
				}
			}
		});
		// fs.rmdirSync(directory_path); // delete directories
		console.log('---done deleting----');
	}
};



function combineAudioTrackForDrop(basename) {
	dropifyThis = basename;
	console.log(basename);

	let track = './recordings/' + basename + '.wav';
	ffmpeg(track)
		.toFormat('mp3')
		.on('error', (err) => {
			console.log('An error occurred: ' + err.message);
		})
		.on('progress', (progress) => {
			// console.log(JSON.stringify(progress));
			console.log('Processing: ' + progress.targetSize + ' KB converted');

		})
		.on('end', () => {
			console.log('Processing finished !');
			var songs = [
				'./sound/inifite_daps-part1.mp3',
				'./sound/all2.mp3',
				'./sound/inifite_daps-part2.mp3',
			];

			var audioconcat = require('audioconcat');
			audioconcat(songs)
				.concat('./sound/all3.mp3')
				.on('start', function(command) {
					console.log('ffmpeg process started:', command);
				})
				.on('error', function(err, stdout, stderr) {
					console.error('Error:', err);
					console.error('ffmpeg stderr:', stderr);
				})
				.on('end', function(output) {
					console.error('Audio created in:', output);
					global.pQueue.enqueue({ 'url': './sound/all3.mp3', 'start': '0s' }, 1);
					// hypeResponse(output, connection, false, 30, '0s');
				});
		})
		.save('./sound/all2.mp3');
}



function recordAudio(user, speaking) {
	// console.log('recording');
	// wtf.dump();
	if (!speaking) {
		let stream = listenStreams.get(user.id);
		// console.log(listenStreams);
		// console.log('stream: ' + stream);
		if (stream) {
			// console.log(stream);
			listenStreams.delete(user.id);

			stream.end(err => {
				if (err) {
					global.userTalking = false;
					console.log('turned off stream error');
					throw err;
				}

				// console.log(global.userTalking === false);

				basename = path.basename(stream.path, '.opus_string');
				// fileList.push(path.join('./recordings', basename));
				// addToList(path.join('./recordings', basename));

				// decode file into pcm
				decode.convertOpusStringToRawPCM(stream.path, basename, function() {
					processRawToWav(
						path.join('./recordings', basename + '.raw_pcm'),
						path.join('./recordings', basename + '.wav'),
						function(data) {
							console.log('Data recieved from talk: ' + data._text);

							count++;

							if (data !== null && data._text != '') {
								console.log('drop: ' + dropifyThis);
								if (dropifyThis === true) {
									combineAudioTrackForDrop(basename);

								} else {
									handleSpeech(user,
										data._text,
										path.join('./recordings', basename + '.raw_pcm'),
										path.join('./recordings', basename + '.wav'),
										path.join('./recordings', basename + '.opus_string'));
								}
							} else {

								if (count > 4) {
									let dirPath = './recordings/';
									global.userTalking = true;
									deleteFolderRecursive(dirPath);
									count = 0;
								}
							}
						});
				});

			});
		}
	}
	// });
}



function handleCommand(audioText, searchTerm = false) {
	let audio;
	var commands = {
		'straight_up': function() {
			audio = './sound/straightup.mp3';
			global.pQueue.enqueue({ 'url': audio, 'start': '0s' }, 1);
		},
		'its_your_boy': function() {
			audio = './sound/itsyaboy.mp3';
			global.pQueue.enqueue({ 'url': audio, 'start': '0s' }, 1);
		},
		'its_the_rock': function() {
			audio = './sound/itstherock.mp3';
			global.pQueue.enqueue({ 'url': audio, 'start': '0s' }, 1);
		},
		'hey_dave': function() {
			audio = './sound/icecubes.mp3';
			global.pQueue.enqueue({ 'url': audio, 'start': '0s' }, 1);
		},
		'oof': function() {
			audio = './sound/oof.mp3';
			global.pQueue.enqueue({ 'url': audio, 'start': '0s' }, 1);
		},
		'poppy_r': function() {
			audio = 'https://www.youtube.com/watch?v=79hRMiSMxFY';
			global.pQueue.enqueue({ 'url': audio, 'start': '0s' }, 1);
		},
		'drop': function() {
			dropifyThis = true;
		},
		'stream_on': function() {
			global.streaming = true;
		},
		'stream_off': function() {
			global.streaming = false;
		},
		'dave_play': function(searchTerm) {
			let opts = {
				maxResults: 10,
				key: process.env.YOUTUBEKEY,
				type: 'video'
			};

			search(searchTerm, opts, function(err, results) {
				if (err) {return console.log(err);}
				console.dir(results[0].link);
				if (!BANNED_URLS.includes(results[0].link)) {
					global.pQueue.enqueue({ 'url': results[0].link, 'start': '0s', 'length': 30 }, 1);
				}
			});
		},
		'seeing_red': function() {
			global.light1.connect().then((l) => {
				l.setRGB(new y.Color(123, 99, 65), 'smooth', 5000);
			});
			global.light2.connect().then((l) => {
				l.setRGB(new y.Color(123, 99, 65), 'smooth', 5000);
			});
			global.light3.connect().then((l) => {
				l.setRGB(new y.Color(123, 99, 65), 'smooth', 5000);
			});
		},
		'word_of_the_day': function() {
			console.log('YOU SAID THE WORD OF THE DAY');
		},
		'default': function() {
			console.log('NOT A COMMAND');
		}
	};
	console.log('audio: ' + audioText);

	if (commands[audioText]) {
		return searchTerm ? commands[audioText](searchTerm) : commands[audioText]();
	} else {
		return commands.default;
	}

}

function handleSpeech(member, speech, input, output, other) {
	var normalizedSpeech = speech.toLowerCase();
	var command = normalizedSpeech.split(' ');


	let fullCommand = command.join(' ');

	if (fullCommand === 'drop that shit' || fullCommand === 'drop that s***') {
		let song = 'https://www.youtube.com/watch?v=z_h5pRXEVs0';
		hypeResponse(song, global.connection, false, 30, '2s');
		
	}

	if (normalizedSpeech.indexOf('straight up') > -1) {
		handleCommand('straight_up');

	} else if (normalizedSpeech.indexOf('it\'s your boy') > -1) {
		handleCommand('its_your_boy');

	} else if (normalizedSpeech.indexOf('it\'s the rock') > -1) {
		handleCommand('its_the_rock');

	} else if (command[0] === 'hey' && (command[1] === 'dave' || command[1] === 'gave')) {
		handleCommand('hey_dave');

	} else if (normalizedSpeech.indexOf(' oof') > -1) {
		handleCommand('oof');

	} else if (normalizedSpeech.indexOf(process.env.SECRETCOMMAND) > -1) {
		handleCommand('poppy_r');
	} else if (normalizedSpeech.indexOf('seeing red') > -1) {
		handleCommand('seeing_red');

	} else if (normalizedSpeech.indexOf('dave play') > -1 && normalizedSpeech !== 'dave play') {
		let searchTerm = normalizedSpeech.split('dave play')[1];
		handleCommand('dave_play', searchTerm);

	} else if (normalizedSpeech.indexOf('hey dave drop this one') > -1) {
		handleCommand('drop');

	} else if (normalizedSpeech.indexOf('hey dave turn on streaming mode' > -1)) {
		handleCommand('stream_on');

	} else if (normalizedSpeech.indexOf('hey dave turn off streaming mode' > -1)) {
		handleCommand('stream_off');

	} else if (normalizedSpeech === global.wordOfTheDay) {
		handleCommand('word_of_the_day');
	}
}

/*******************

	Transcoder

******************/
function processRawToWav(filepath, outputpath, cb) {

	fs.closeSync(fs.openSync(outputpath, 'w'));

}

module.exports = {
	onOpus,
	recordAudio
};
import {
	MessageCollector
} from 'discord.js';
import {
	hypeResponse
} from '../modals/hypeResponse/hype_response.js';

const opus = require('node-opus');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const recordingsPath = './recordings';
const decode = require('../decodeOpus.js');
const WitSpeech = require('node-witai-speech');
const fs = require('fs');
let originalPath;

var listenStreams = new Map();

let basename;
let fileList = [];
const fileListObj = new Map();
let cleaningFolder = false;

let currTalkingUser;
let count = 0;

function onOpus(user, data) {
	let hexString = data.toString('hex');
	let stream = listenStreams.get(user.id);
	if (!stream) {
		if (hexString === 'f8fffe') {
			return;
		}
		let outputPath = path.join(recordingsPath, `${user.id}-${Date.now()}.opus_string`);
		originalPath = path.join(recordingsPath, `${user.id}-${Date.now()}.opus_string`);
		stream = fs.createWriteStream(outputPath);
		listenStreams.set(user.id, stream);
	}
	stream.write(`,${hexString}`);
}

Array.prototype.remove = function (from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

/*
	'1231231' : {
		'opus' : 1
		'wav' : 1
		'total': 2
	}
*/


function addToList(key) {
	if (fileListObj[key] === undefined) {
		console.log('set');
		fileListObj[key] = {
			'.opus': 1,
			'.opus_string': 1,
			'.wav': 1,
			'.raw_pcm': 1,
			'total': 3
		};
		// fileListObj.set(key, { '.opus' : 1, '.wav' : 1, '.raw_pcm' : 1, 'total' : 3});
	}
}



//Attemps to delete any local files
function cleanUpFiles(files, cb) {
	cleaningFolder = true;
	console.log(files);
	files.forEach(file => {
		console.log(file);
		fs.unlinkSync('./recordings/' + file, (err) => {
			console.log('deleting');
			if (err) {
				cleaningFolder = false;
				cb(err);
				return;
			}
		});

	});

	// global.userTalking = false;
	cb(null);
	cleaningFolder = false;
	

}

let rmDir = function (dirPath) {
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

const deleteFolderRecursive = function (directory_path) {
	console.log('start deleting');
	if (fs.existsSync(directory_path)) {
		fs.readdirSync(directory_path).forEach(function (file, index) {
			var currentPath = path.join(directory_path, file);
			if (fs.lstatSync(currentPath).isDirectory()) {
				deleteFolderRecursive(currentPath);
			} else { 
				fs.unlinkSync(currentPath); // delete file
			}
		});
		// fs.rmdirSync(directory_path); // delete directories
		console.log('---done deleting----');
	}
};

function recordAudio(user, speaking) {
	console.log('recording');
	if (!speaking) {
		let stream = listenStreams.get(user.id);
		console.log('stream: ' + stream);
		if (stream) {

			listenStreams.delete(user.id);

			stream.end(err => {
				if (err) {
					global.userTalking = false;
					console.log('turned off stream error');
					throw err;
				}

				console.log(global.userTalking === false);

				basename = path.basename(stream.path, '.opus_string');
				// fileList.push(path.join('./recordings', basename));
				// addToList(path.join('./recordings', basename));
				let text = 'default';

				// decode file into pcm
				decode.convertOpusStringToRawPCM(stream.path, basename, function () {
					processRawToWav(
						path.join('./recordings', basename + '.raw_pcm'),
						path.join('./recordings', basename + '.wav'),
						function (data) {
							console.log('data recieved from talk');
							console.log(data);

							count++;

							if (data !== null) {
								handleSpeech(user, data._text, path.join('./recordings', basename + '.raw_pcm'), path.join('./recordings', basename + '.wav'), path.join('./recordings', basename + '.opus_string'));
							}
							if(count > 4){
								let dirPath = './recordings/';
								global.userTalking = true;
								deleteFolderRecursive(dirPath);
								count = 0;
							}
						});
				});
			});
		}
	}
	// });
}

//break out?
function handleSpeech(member, speech, input, output, other) {
	var command = speech.toLowerCase().split(' ');
	// console.log(command);

	if (currTalkingUser !== false) {
		let fullCommand = command.join(' ');

		if (fullCommand === 'drop that shit' || fullCommand === 'drop that s***') {
			let song = 'https://www.youtube.com/watch?v=z_h5pRXEVs0';
			hypeResponse(song, global.connection, false, 30, '2s');
		}

		currTalkingUser = false;
	}

	if (speech.toLowerCase().indexOf('straight up') > -1) {
		let song = './sound/straightup.mp3';
		const dispatcher = global.connection.playStream(song, {
			volume: 0.2,
			passes: 3,
		});

		dispatcher.on('finish', () => {
			dispatcher.end();
			dispatcher.destroy();
		});
	}

	if (speech.toLowerCase().indexOf('it\'s your boy') > -1) {
		let song = './sound/itsyaboy.mp3';
		const dispatcher = global.connection.playStream(song, {
			volume: 0.2,
			passes: 3,
		});

		dispatcher.on('finish', () => {
			dispatcher.end();
			dispatcher.destroy();
		});
	}

	if (speech.toLowerCase().indexOf('it\'s the rock') > -1) {
		let song = './sound/itstherock.mp3';
		const dispatcher = global.connection.playStream(song, {
			volume: 0.2,
			passes: 3,
		});

		dispatcher.on('finish', () => {
			dispatcher.end();
			dispatcher.destroy();
		});
	}

	if (command[0] === 'hey' && (command[1] === 'dave' || command[1] === 'gave')) {
		currTalkingUser = member;
		const dispatcher = global.connection.playStream('./sound/icecubes.mp3', {
			volume: 0.2,
			passes: 3,
		});

		dispatcher.on('finish', () => {
			dispatcher.end();
			dispatcher.destroy();
		});
	}

	if (speech.toLowerCase().indexOf('oof') > -1) {
		const dispatcher = global.connection.playStream('./sound/oof.mp3', {
			volume: 0.2,
			passes: 3,
		});

		dispatcher.on('finish', () => {
			dispatcher.end();
			dispatcher.destroy();
		});
	}
	// console.log('clean up');
	// cleanUpFiles();
	// rmDir(dirPath, false);
	// global.userTalking = false;
	// console.log('done cleaning turning false in speech');
}

/*******************

	Transcoder

******************/
function processRawToWav(filepath, outputpath, cb) {
	fs.closeSync(fs.openSync(outputpath, 'w'));
	var command = ffmpeg(filepath)
		.addInputOptions([
			'-f s32le',
			'-ar 48k',
			'-ac 1'
		])
		.on('end', function () {
			// Stream the file to be sent to the wit.ai
			var stream = fs.createReadStream(outputpath);

			// Its best to return a promise
			var parseSpeech = new Promise((ressolve, reject) => {
				// call the wit.ai api with the created stream
				WitSpeech.extractSpeechIntent('R7WQQZ5O7MHGRY6XB4PRNFZOU3FDR7SC', stream, 'audio/wav',
					(err, res) => {
						if (err) {
							return reject(err);
						}
						ressolve(res);
					});
			});

			// check in the promise for the completion of call to witai
			parseSpeech.then((data) => {
				console.log('you said: ' + data._text);
				cb(data);
				//return data;
			}).catch((err) => {
				cb(null);
			});
		})
		.on('error', function (err) {
			console.log('an error happened: ' + err.message);
		})
		.addOutput(outputpath)
		.run();
}

module.exports = {
	onOpus,
	recordAudio
};
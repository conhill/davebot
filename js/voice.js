const receiver = connection.createReceiver();
var bodyParser = require('body-parser');
const opus = require('node-opus');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const recordingsPath = './recordings';
const decode = require('./decodeOpus.js');
const WitSpeech = require('node-witai-speech');

var listenStreams = new Map();

const rate = 48000;
const frame_size = 1920;
const channels = 2;
var listenReceiver = null;

var originalPath;
receiver.on('opus', function(user, data) {
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
});

listenReceiver = receiver;

/*
connection.on('speaking', (user, speaking) => {
  if (!speaking) {
    let stream = listenStreams.get(user.id);
    console.log('stream: ' + stream);
    if (stream) {
      listenStreams.delete(user.id);
      stream.end(err => {
        if (err) {
          console.error(err);
        }

        let basename = path.basename(stream.path, '.opus_string');
        let text = "default";

        // decode file into pcm
        decode.convertOpusStringToRawPCM(stream.path,
          basename,
          (function() {
            processRawToWav(
              path.join('./recordings', basename + '.raw_pcm'),
              path.join('./recordings', basename + '.wav'),
              (function(data) {
                if (data != null) {
                  handleSpeech(user, data._text, path.join('./recordings', basename + '.raw_pcm'), path.join('./recordings', basename + '.wav'), path.join('./recordings', basename + '.opus_string'));
                } else {

                  fs.unlink(path.join('./recordings', basename + '.raw_pcm'), (err) => {
                    if (err) {
                      console.log("failed to delete local :" + err);
                    }
                  });
                  fs.unlink(path.join('./recordings', basename + '.wav'), (err) => {
                    if (err) {
                      console.log("failed to delete local :" + err);
                    }
                  });
                  // fs.unlink(path.join('./recordings', basename + '.opus_string'), (err) => {
                  //   if (err) {
                  //     console.log("failed to delete local :" + err);
                  //   } else {
                  //     console.log('successfully deleted local ');
                  //   }
                  // });
                  // fs.unlink(originalPath, (err) => {
                  //   if (err) {
                  //     console.log("failed to delete local :" + err);
                  //   } else {
                  //     console.log('successfully deleted local ');
                  //   }
                  // });
                }
              }).bind(this))
          }).bind(this));
      });
    }
  }
});
*/
function handleSpeech(member, speech, input, output, other) {
	var command = speech.toLowerCase().split(' ');
	console.log(command);
	if (command[0] === "hey" && (command[1] === "dave" || command[1] === "gave")) {
		console.log('good');
		//JoinChannel('374687366167920640');
	}
	fs.unlink(path.join('./recordings', basename + '.raw_pcm'), (err) => {
		if (err) {
			console.log("failed to delete local :" + err);
		}
	});
	fs.unlink(path.join('./recordings', basename + '.wav'), (err) => {
		if (err) {
			console.log("failed to delete local :" + err);
		}
	});
	fs.unlink(path.join('./recordings', basename + '.opus_string'), (err) => {
		if (err) {
			console.log("failed to delete local :" + err);
		}
	});
	fs.unlink(originalPath, (err) => {
		if (err) {
			console.log("failed to delete local:" + err);
		}
	});
}

function processRawToWav(filepath, outputpath, cb) {
	fs.closeSync(fs.openSync(outputpath, 'w'));
	var command = ffmpeg(filepath)
		.addInputOptions([
			'-f s32le',
			'-ar 48k',
			'-ac 1'
		])
		.on('end', function() {
			// Stream the file to be sent to the wit.ai
			var stream = fs.createReadStream(outputpath);

			// Its best to return a promise
			var parseSpeech = new Promise((ressolve, reject) => {
				// call the wit.ai api with the created stream
				WitSpeech.extractSpeechIntent('R7WQQZ5O7MHGRY6XB4PRNFZOU3FDR7SC', stream, "audio/wav",
					(err, res) => {
						if (err) return reject(err);
						ressolve(res);
					});
			});

			// check in the promise for the completion of call to witai
			parseSpeech.then((data) => {
					console.log("you said: " + data._text);
					cb(data);
					//return data;
				})
				.catch((err) => {
					cb(null);
				})
		})
		.on('error', function(err) {
			//console.log('an error happened: ' + err.message);
		})
		.addOutput(outputpath)
		.run();
}
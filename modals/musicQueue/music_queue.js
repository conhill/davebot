'use strict';

import ytdl from 'ytdl-core';
import { hypeResponse } from '../hypeResponse/hype_response.js';

let isPlaying = false;
class QElement {
	constructor(element, priority) {
		this.element = element;
		this.priority = priority;
	}
}

module.exports = class PriorityQueue {

	// An array is used to implement priority 
	constructor() {
		this.items = [];
	}

	checkAudioObj(audio) {
		if (!audio.url)
			return false;
		if (!audio.start)
			audio.start = '0s';
		if (!audio.length && audio.url.indexOf('youtube') > -1)
			audio.length = 30;

		return audio;
	}

	enqueue(element, priority) {
		// creating object from queue element
		console.log('ENQUEING ELEMENT');
		console.log(element);
		let audioObj = this.checkAudioObj(element);

		if (!audioObj) {
			console.log('Bad Audio Link: ' + element);
			return;
		}

		var qElement = new QElement(audioObj, priority);
		var contain = false;

		// iterating through the entire 
		// item array to add element at the 
		// correct location of the Queue 
		for (var i = 0; i < this.items.length; i++) {
			if (this.items[i].priority > qElement.priority) {
				// Once the correct location is found it is 
				// enqueued 
				this.items.splice(i, 0, qElement);
				contain = true;
				break;
			}
		}

		// if the element have the highest priority 
		// it is added at the end of the queue 
		if (!contain) {
			this.items.push(qElement);
		}

		if (this.isPlaying() === false) {
			isPlaying = true;
			this.play();
		}

	}

	dequeue() {
		if (this.isEmpty()) {
			return 'Underflow';
		}
		return this.items.shift();
	}

	front() {
		if (this.isEmpty()) {
			return 'No elements in Queue';
		}
		return this.items[0];
	}


	rear() {
		if (this.isEmpty()) {
			return 'No elements in Queue';
		}
		return this.items[this.items.length - 1];
	}

	isEmpty() {
		return this.items.length == 0;
	}

	isPlaying() {
		return isPlaying;
	}

	printPQueue() {
		var str = '';
		for (var i = 0; i < this.items.length; i++) {
			str += this.items[i].element + ' ';
		}
		return str;
	}

	getSongInfo() {
		return this.front().element;
	}

	endDispatcher(dispatcher) {

		this.dequeue();

		if (!this.isEmpty()) {
			this.play();
		} else {
			isPlaying = false;
		}
	}
	// {'url': url, '', 'start': '0s', 'length': 30 }
	play() {
		console.log('CURRENT QUEUE');
		console.log(this);
		let queue = this;
		let song = this.getSongInfo();
		let audioLink = song.url;
		let audioStart = song.start;
		let audioLength = song.length;
		let connection = global.connection;
		let counter;

		if (audioLink.indexOf('youtube') > -1) {
			if (isNaN(audioLength) && audioLength.indexOf('s') > -1) {
				counter = audioLength.split('s')[0];
			} else {
				counter = audioLength;
			}
			let dispatcher = connection.playStream(ytdl(audioLink, { begin: audioStart }))
				.on('end', reason => {
					if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
					else console.log(reason);
					this.endDispatcher(dispatcher);
				})
				.on('error', error => console.error(error));

			if (counter) {
				var playTime = setInterval(function() {
					counter--;
					if (counter === 0) {
						clearInterval(playTime);
						// this.endDispatcher(dispatcher);
						dispatcher.end();
					}
				}, 1000);
			}
		} else {
			console.log('PLAYING FILE AUDIO');
			let dispatcher = connection.playStream(audioLink)
				.on('end', reason => {
					if (reason === 'Stream is not generating quickly enough.') console.log('Song ended.');
					else console.log(reason);
					this.endDispatcher(dispatcher);
				})
				.on('error', error => console.error(error));
		}
	}
};